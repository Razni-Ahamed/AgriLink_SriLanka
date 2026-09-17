"""Exports real test-split photos plus Python's model outputs, for the backend parity check.

Run from the ml/ folder after training a crop's model:

    .venv/Scripts/python -m tools.export_parity_photos --crop cassava \
        --source kaggle-cassava-2020=C:/path/to/cassava-leaf-disease-classification.zip \
        --output-dir C:/somewhere/outside/the/repo/cassava-parity

Then run RealModelParityTests with AGRILINK_MODEL_PARITY_DIR set to that folder. The photos come
from the dataset, so keep the folder outside the repo — dataset licences do not allow committing them.
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import numpy as np
import onnxruntime
from PIL import Image

from agrilink_ml import ML_ROOT, MANIFESTS_DIR
from agrilink_ml.prepare import parse_sources
from agrilink_ml.sources import DatasetReader
from agrilink_ml.split import TEST
from agrilink_ml.train import eval_transform, read_manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--crop", required=True)
    parser.add_argument("--source", action="append", required=True, metavar="NAME=PATH")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--count", type=int, default=60)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args(argv)

    crop = args.crop.lower()
    model_dir = ML_ROOT / "models" / crop
    metadata = json.loads((model_dir / "model.json").read_text(encoding="utf-8"))
    session = onnxruntime.InferenceSession(str(model_dir / "model.onnx"), providers=["CPUExecutionProvider"])
    transform = eval_transform(metadata["input"]["width"])

    samples = read_manifest(MANIFESTS_DIR / f"{crop}.csv")[TEST]
    picks = np.random.default_rng(args.seed).choice(len(samples), min(args.count, len(samples)), replace=False)
    roots = parse_sources(args.source)
    readers = {name: DatasetReader(root) for name, root in roots.items()}

    args.output_dir.mkdir(parents=True, exist_ok=True)
    expected = {}
    try:
        for index in picks:
            sample = samples[int(index)]
            data = readers[sample.source].read_bytes(sample.path)
            name = f"{sample.source}__{sample.path.replace('/', '__')}"
            (args.output_dir / name).write_bytes(data)
            tensor = transform(Image.open(io.BytesIO(data)).convert("RGB")).unsqueeze(0).numpy()
            probabilities = session.run([metadata["output"]["name"]], {metadata["input"]["name"]: tensor})[0][0]
            expected[name] = {"label": sample.label_id, "probabilities": probabilities.tolist()}
    finally:
        for reader in readers.values():
            reader.close()

    (args.output_dir / "expected.json").write_text(json.dumps(expected), encoding="utf-8")
    print(f"Wrote {len(expected)} photos and expected.json to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
