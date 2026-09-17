"""Trains a crop's disease classifier and exports it for the backend.

Usage (from the ml/ folder, after building the crop's manifest with agrilink_ml.prepare):

    .venv/Scripts/python -m agrilink_ml.train --crop cassava \
        --source kaggle-cassava-2020=C:/path/to/cassava-leaf-disease-classification.zip

Writes to models/<crop>/ (gitignored):
  model.onnx    the classifier; input "image" (N,3,S,S), output "probabilities" (N,classes),
                with temperature scaling already applied
  model.json    everything the backend needs to use it: preprocessing, classes, per-class
                auto-release thresholds, metrics
  report.md     human-readable evaluation
  history.csv   per-epoch loss and validation scores
  best.pt       the PyTorch weights (for fine-tuning later)
"""

from __future__ import annotations

import os

# Must run before numpy is imported. Every DataLoader worker process imports this module, and
# OpenBLAS otherwise reserves memory for a thread per CPU core in each one — with 12+ workers on
# Windows that exhausted the machine's commit limit. Workers only decode images; they need no BLAS
# threads, and the main process's calibration maths is tiny.
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import argparse
import csv
import gc
import hashlib
import io
import json
import math
import random
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import v2 as transforms

from . import ML_ROOT, MANIFESTS_DIR
from .evaluation import auto_release_metrics, choose_class_thresholds, classification_metrics, fit_temperature, softmax
from .labels import CropLabels, load_crop_labels
from .prepare import parse_sources
from .sources import DatasetReader
from .split import TEST, TRAIN, VALIDATION

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


@dataclass(frozen=True)
class Sample:
    source: str
    path: str
    label_id: int


def read_manifest(path: Path) -> dict[str, list[Sample]]:
    by_split: dict[str, list[Sample]] = {TRAIN: [], VALIDATION: [], TEST: []}
    with path.open(encoding="utf-8") as file:
        for row in csv.DictReader(file):
            by_split[row["split"]].append(Sample(row["source"], row["path"], int(row["label_id"])))
    return by_split


class ManifestDataset(Dataset):
    """Reads manifest images straight from each dataset's zip or folder. Readers are opened lazily
    in whichever process uses them, because an open zip file cannot be shared with DataLoader
    worker processes."""

    def __init__(self, samples: list[Sample], roots: dict[str, Path], transform):
        missing = {s.source for s in samples} - set(roots)
        if missing:
            raise ValueError(f"No --source given for dataset(s) used by the manifest: {sorted(missing)}.")
        self.samples = samples
        self.roots = roots
        self.transform = transform
        self._readers: dict[str, DatasetReader] = {}

    def __getstate__(self):
        state = self.__dict__.copy()
        state["_readers"] = {}
        return state

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        sample = self.samples[index]
        reader = self._readers.get(sample.source)
        if reader is None:
            reader = self._readers[sample.source] = DatasetReader(self.roots[sample.source])
        with Image.open(io.BytesIO(reader.read_bytes(sample.path))) as image:
            rgb = image.convert("RGB")
        return self.transform(rgb), sample.label_id


def train_transform(size: int):
    return transforms.Compose([
        transforms.RandomResizedCrop(size, scale=(0.35, 1.0), antialias=True),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25, hue=0.03),
        transforms.ToImage(),
        transforms.ToDtype(torch.float32, scale=True),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])


def eval_transform(size: int):
    # Must stay identical to what the backend does before inference — see the "input" block written
    # to model.json: stretch to size x size (bilinear), RGB, scale to 0..1, ImageNet normalisation.
    return transforms.Compose([
        transforms.Resize((size, size), interpolation=transforms.InterpolationMode.BILINEAR, antialias=True),
        transforms.ToImage(),
        transforms.ToDtype(torch.float32, scale=True),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])


def class_weights(samples: list[Sample], class_count: int) -> torch.Tensor:
    """Square-root inverse class frequency, normalised to mean 1: rare diseases count for more
    without letting a class of a few hundred photos dominate training."""
    counts = np.bincount([s.label_id for s in samples], minlength=class_count).astype(np.float64)
    weights = np.sqrt(counts.sum() / (class_count * np.maximum(counts, 1)))
    return torch.tensor(weights / weights.mean(), dtype=torch.float32)


class CalibratedClassifier(nn.Module):
    """What gets exported: the network plus its fitted temperature, returning probabilities."""

    def __init__(self, network: nn.Module, temperature: float):
        super().__init__()
        self.network = network
        self.register_buffer("temperature", torch.tensor(float(temperature)))

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        return F.softmax(self.network(image) / self.temperature, dim=1)


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def cosine_with_warmup(step: int, total_steps: int, warmup_steps: int) -> float:
    if step < warmup_steps:
        return (step + 1) / warmup_steps
    progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
    return 0.5 * (1 + math.cos(math.pi * progress))


@torch.no_grad()
def predict_logits(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    all_logits, all_labels = [], []
    for images, labels in loader:
        with torch.autocast(device.type, enabled=device.type == "cuda"):
            logits = model(images.to(device, non_blocking=True))
        all_logits.append(logits.float().cpu().numpy())
        all_labels.append(labels.numpy())
    return np.concatenate(all_logits), np.concatenate(all_labels)


def export_onnx(model: CalibratedClassifier, image_size: int, path: Path) -> None:
    # PyTorch's ONNX exporter prints emoji; on Windows, output redirected to a file otherwise uses
    # the legacy code page, which cannot encode them and crashes the export. Done here rather than
    # in main() so every caller of the export is covered.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    model = model.eval().cpu()
    dummy = torch.randn(1, 3, image_size, image_size)
    torch.onnx.export(
        model,
        (dummy,),
        str(path),
        input_names=["image"],
        output_names=["probabilities"],
        dynamic_shapes={"image": {0: torch.export.Dim("batch", min=1, max=256)}},
        dynamo=True,
        external_data=False,
    )


def verify_onnx_matches_pytorch(model: CalibratedClassifier, onnx_path: Path, images: torch.Tensor) -> float:
    """Runs the same images through PyTorch and ONNX Runtime; a mismatch means the export is not
    the model that was evaluated, so it fails loudly instead of shipping."""
    import onnx
    import onnxruntime

    onnx.checker.check_model(str(onnx_path))
    session = onnxruntime.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    onnx_probs = session.run(["probabilities"], {"image": images.numpy()})[0]
    with torch.no_grad():
        torch_probs = model.eval().cpu()(images).numpy()

    max_difference = float(np.abs(onnx_probs - torch_probs).max())
    if max_difference > 1e-4:
        raise RuntimeError(f"ONNX output differs from PyTorch by {max_difference:.2e}; not shipping this export.")
    return max_difference


def git_commit() -> str | None:
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ML_ROOT, capture_output=True, text=True,
                              check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def metric_summary(probs: np.ndarray, labels: np.ndarray, labels_file: CropLabels,
                   thresholds: list[float | None]) -> dict:
    metrics = classification_metrics(probs, labels, len(labels_file.classes))
    released = auto_release_metrics(probs, labels, thresholds)
    return {
        "accuracy": metrics["accuracy"],
        "macroF1": metrics["macro_f1"],
        "autoRelease": {
            "precision": released["precision"],
            "coverage": released["coverage"],
            "count": released["count"],
        },
        "perClass": {
            c.key: {**metrics["per_class"][c.id],
                    "autoReleased": released["perClass"][c.id]["released"],
                    "autoReleasePrecision": released["perClass"][c.id]["precision"]}
            for c in labels_file.classes
        },
        "confusionMatrix": metrics["confusion_matrix"],
    }


def write_report(path: Path, metadata: dict, labels_file: CropLabels) -> None:
    lines = [
        f"# {labels_file.crop} classifier - {metadata['modelVersion']}",
        "",
        f"- Architecture: `{metadata['training']['architecture']}` at {metadata['input']['width']}px, "
        f"best epoch {metadata['training']['bestEpoch']} of {metadata['training']['epochs']}",
        f"- Temperature: {metadata['temperature']:.3f}",
        f"- Auto-release: per-class confidence thresholds chosen on the validation split for "
        f"{metadata['targetPrecision']:.0%} precision; a class without one always goes to an officer",
        "",
        "| Class | Auto-release threshold |",
        "|---|---:|",
    ]
    for c in metadata["classes"]:
        threshold = c["autoReleaseThreshold"]
        lines.append(f"| {c['name']} | {'none - officer' if threshold is None else f'{threshold:.4f}'} |")
    lines.append("")

    for split_name in ("validation", "test"):
        m = metadata["metrics"][split_name]
        lines += [
            f"## {split_name.capitalize()}",
            "",
            f"Accuracy {m['accuracy']:.2%} - macro F1 {m['macroF1']:.3f} - "
            f"auto-released: {m['autoRelease']['coverage']:.1%} of photos at {m['autoRelease']['precision']:.2%} precision",
            "",
            "| Class | Precision | Recall | F1 | Photos | Auto-released | Auto-release precision |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
        for c in labels_file.classes:
            pc = m["perClass"][c.key]
            released_precision = f"{pc['autoReleasePrecision']:.2%}" if pc["autoReleased"] else "-"
            lines.append(f"| {c.name} | {pc['precision']:.2%} | {pc['recall']:.2%} | {pc['f1']:.3f} | {pc['support']} "
                         f"| {pc['autoReleased']} | {released_precision} |")
        lines += ["", "Confusion matrix (rows = true class, columns = predicted, in class id order):", "", "```"]
        lines += ["  ".join(f"{v:6d}" for v in row) for row in m["confusionMatrix"]]
        lines += ["```", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def train_network(network: nn.Module, args, samples: dict[str, list[Sample]], roots: dict[str, Path],
                  class_count: int, device: torch.device, output_dir: Path) -> list[dict]:
    """Trains, saving the weights with the best validation macro F1 to best.pt. The DataLoaders and
    their persistent worker processes live only inside this function, so they are shut down before
    evaluation starts instead of piling up alongside the evaluation loaders."""
    pin = device.type == "cuda"
    train_loader = DataLoader(
        ManifestDataset(samples[TRAIN], roots, train_transform(args.image_size)),
        batch_size=args.batch_size, shuffle=True, drop_last=True, num_workers=args.workers,
        pin_memory=pin, persistent_workers=args.workers > 0, prefetch_factor=4 if args.workers > 0 else None)
    val_workers = max(0, args.workers // 3)
    val_loader = DataLoader(
        ManifestDataset(samples[VALIDATION], roots, eval_transform(args.image_size)),
        batch_size=args.batch_size * 2, num_workers=val_workers, pin_memory=pin, persistent_workers=val_workers > 0)

    criterion = nn.CrossEntropyLoss(weight=class_weights(samples[TRAIN], class_count).to(device),
                                    label_smoothing=args.label_smoothing)
    optimizer = torch.optim.AdamW(network.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    total_steps = args.epochs * len(train_loader)
    warmup_steps = min(len(train_loader), total_steps)
    scheduler = torch.optim.lr_scheduler.LambdaLR(
        optimizer, lambda step: cosine_with_warmup(step, total_steps, warmup_steps))
    scaler = torch.amp.GradScaler(enabled=device.type == "cuda")

    best_f1 = -1.0
    history = []
    for epoch in range(1, args.epochs + 1):
        network.train()
        started, running_loss, batches = time.time(), 0.0, 0
        for images, labels in train_loader:
            images = images.to(device, non_blocking=True, memory_format=torch.channels_last)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device.type, enabled=device.type == "cuda"):
                loss = criterion(network(images), labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            running_loss += loss.item()
            batches += 1

        val_logits, val_labels = predict_logits(network, val_loader, device)
        val_metrics = classification_metrics(softmax(val_logits), val_labels, class_count)
        record = {"epoch": epoch, "train_loss": running_loss / max(1, batches),
                  "val_accuracy": val_metrics["accuracy"], "val_macro_f1": val_metrics["macro_f1"],
                  "seconds": round(time.time() - started, 1)}
        history.append(record)
        print(f"epoch {epoch}/{args.epochs}  loss {record['train_loss']:.4f}  val acc {record['val_accuracy']:.4f}  "
              f"val macro-F1 {record['val_macro_f1']:.4f}  ({record['seconds']}s)")

        # Macro F1 rather than accuracy: accuracy alone rewards predicting the majority disease.
        if val_metrics["macro_f1"] > best_f1:
            best_f1 = val_metrics["macro_f1"]
            torch.save(network.state_dict(), output_dir / "best.pt")

    with (output_dir / "history.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(history[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(history)
    return history


def read_history(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as file:
        return [{k: float(v) if k != "epoch" else int(v) for k, v in row.items()} for row in csv.DictReader(file)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--crop", required=True)
    parser.add_argument("--source", action="append", required=True, metavar="NAME=PATH")
    parser.add_argument("--manifest", type=Path, help="Defaults to manifests/<crop>.csv.")
    parser.add_argument("--output-dir", type=Path, help="Defaults to models/<crop>.")
    parser.add_argument("--architecture", default="efficientnet_b0", help="Any timm model name.")
    parser.add_argument("--no-pretrained", action="store_true", help="Start from random weights (tests only).")
    parser.add_argument("--image-size", type=int, default=384)
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=48)
    parser.add_argument("--lr", type=float, default=4e-4)
    parser.add_argument("--weight-decay", type=float, default=0.02)
    parser.add_argument("--label-smoothing", type=float, default=0.1)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--target-precision", type=float, default=0.95)
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--skip-training", action="store_true",
                        help="Reuse best.pt and history.csv already in the output folder; only calibrate, "
                             "evaluate and export.")
    args = parser.parse_args(argv)

    import timm  # imported here so --help works without it

    crop = args.crop.lower()
    labels_file = load_crop_labels(crop)
    class_count = len(labels_file.classes)
    manifest_path = args.manifest or MANIFESTS_DIR / f"{crop}.csv"
    output_dir = args.output_dir or ML_ROOT / "models" / crop
    output_dir.mkdir(parents=True, exist_ok=True)

    seed_everything(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'}")
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True

    samples = read_manifest(manifest_path)
    roots = parse_sources(args.source)
    print(f"Photos: train {len(samples[TRAIN])}, validation {len(samples[VALIDATION])}, test {len(samples[TEST])}")

    network = timm.create_model(args.architecture, pretrained=not args.no_pretrained and not args.skip_training,
                                num_classes=class_count, drop_rate=0.3)
    network = network.to(device, memory_format=torch.channels_last)

    if args.skip_training:
        history = read_history(output_dir / "history.csv")
        print(f"Skipping training; using {output_dir / 'best.pt'}")
    else:
        history = train_network(network, args, samples, roots, class_count, device, output_dir)
        gc.collect()  # make sure the training loaders' worker processes are gone before evaluation
    best_epoch = max(history, key=lambda record: record["val_macro_f1"])["epoch"]

    network.load_state_dict(torch.load(output_dir / "best.pt", map_location=device))

    # Evaluation loaders: fewer workers, not persistent — each is iterated once.
    eval_workers = max(0, args.workers // 3)

    def eval_loader(split: str) -> DataLoader:
        return DataLoader(ManifestDataset(samples[split], roots, eval_transform(args.image_size)),
                          batch_size=args.batch_size * 2, num_workers=eval_workers, pin_memory=device.type == "cuda")

    val_logits, val_labels = predict_logits(network, eval_loader(VALIDATION), device)
    temperature = fit_temperature(val_logits, val_labels)
    val_probs = softmax(val_logits, temperature)
    thresholds = choose_class_thresholds(val_probs, val_labels, args.target_precision)

    test_loader = eval_loader(TEST)
    test_logits, test_labels = predict_logits(network, test_loader, device)
    test_probs = softmax(test_logits, temperature)

    calibrated = CalibratedClassifier(network.to(memory_format=torch.contiguous_format), temperature)
    onnx_path = output_dir / "model.onnx"
    export_onnx(calibrated, args.image_size, onnx_path)
    check_images = torch.stack([test_loader.dataset[i][0] for i in range(min(8, len(test_loader.dataset)))])
    onnx_difference = verify_onnx_matches_pytorch(calibrated, onnx_path, check_images)

    trained_at = datetime.now(timezone.utc)
    metadata = {
        "crop": labels_file.crop,
        "labelsVersion": labels_file.version,
        "modelVersion": f"{crop}-{trained_at:%Y%m%d-%H%M%S}",
        "input": {
            "name": "image", "layout": "NCHW", "width": args.image_size, "height": args.image_size,
            "colorOrder": "RGB", "resize": "stretch", "interpolation": "bilinear",
            "scale": 1 / 255, "mean": list(IMAGENET_MEAN), "std": list(IMAGENET_STD),
        },
        "output": {"name": "probabilities"},
        # autoReleaseThreshold applies when this class is the model's top prediction: release the
        # agent's stored advice only if the probability is at or above it. null means never.
        "classes": [{"id": c.id, "key": c.key, "name": c.name, "autoReleaseThreshold": thresholds[c.id]}
                    for c in labels_file.classes],
        "temperature": temperature,
        "targetPrecision": args.target_precision,
        "metrics": {
            "validation": metric_summary(val_probs, val_labels, labels_file, thresholds),
            "test": metric_summary(test_probs, test_labels, labels_file, thresholds),
        },
        "training": {
            "architecture": args.architecture, "pretrained": not args.no_pretrained,
            "epochs": len(history), "bestEpoch": best_epoch, "batchSize": args.batch_size, "lr": args.lr,
            "weightDecay": args.weight_decay, "labelSmoothing": args.label_smoothing, "seed": args.seed,
            "device": torch.cuda.get_device_name(0) if device.type == "cuda" else "cpu",
            "torch": torch.__version__, "timm": timm.__version__,
            "manifestSha1": hashlib.sha1(manifest_path.read_bytes()).hexdigest(),
            "gitCommit": git_commit(), "trainedAt": trained_at.isoformat(),
            "onnxMaxDifference": onnx_difference,
        },
    }
    (output_dir / "model.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    write_report(output_dir / "report.md", metadata, labels_file)
    print((output_dir / "report.md").read_text(encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
