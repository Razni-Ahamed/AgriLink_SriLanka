"""Generates the fixtures the backend's image-classification tests compare against.

Run from the ml/ folder whenever eval preprocessing in agrilink_ml.train changes:

    .venv/Scripts/python -m tools.make_backend_fixtures

Writes to backend/AgriLink.API.Tests/Fixtures/ImageClassification/:
  preprocessing/source.png          a synthetic photo (generated here, so no dataset licence applies)
  preprocessing/expected-96.bin     agrilink_ml.train.eval_transform(96) of it: float32 little-endian, CHW
  models/testcrop/model.onnx        a tiny 3-class model (red / green / blue) exported the same way as
  models/testcrop/model.json        real models, with the same metadata shape
"""

from __future__ import annotations

import json

import numpy as np
import torch
from PIL import Image
from torch import nn

from agrilink_ml import ML_ROOT
from agrilink_ml.train import IMAGENET_MEAN, IMAGENET_STD, CalibratedClassifier, eval_transform, export_onnx

FIXTURES = ML_ROOT.parent / "backend" / "AgriLink.API.Tests" / "Fixtures" / "ImageClassification"
PREPROCESS_SIZE = 96


def synthetic_photo(width: int = 320, height: int = 240) -> Image.Image:
    """Smooth gradients plus fine texture and hard edges: enough high-frequency detail that a
    resize without proper antialiasing produces visibly different numbers."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    rng = np.random.default_rng(7)
    red = 128 + 90 * np.sin(x / 37) * np.cos(y / 53)
    green = 128 + 100 * np.sin((x + y) / 23)
    blue = 128 + 80 * np.cos(x / 11) + 30 * (((x // 16) + (y // 16)) % 2)
    image = np.stack([red, green, blue], axis=-1) + rng.normal(0, 12, size=(height, width, 3))
    return Image.fromarray(np.clip(image, 0, 255).astype(np.uint8), "RGB")


class MeanColourNetwork(nn.Module):
    """Averages each colour channel and scores red, green and blue classes from it."""

    def __init__(self):
        super().__init__()
        self.scores = nn.Linear(3, 3, bias=False)
        with torch.no_grad():
            self.scores.weight.copy_(torch.tensor([[4.0, -2.0, -2.0], [-2.0, 4.0, -2.0], [-2.0, -2.0, 4.0]]))

    def forward(self, image: torch.Tensor) -> torch.Tensor:
        return self.scores(image.mean(dim=(2, 3)))


def main() -> None:
    preprocessing = FIXTURES / "preprocessing"
    preprocessing.mkdir(parents=True, exist_ok=True)
    photo = synthetic_photo()
    photo.save(preprocessing / "source.png")
    tensor = eval_transform(PREPROCESS_SIZE)(Image.open(preprocessing / "source.png").convert("RGB"))
    tensor.numpy().astype("<f4").tofile(preprocessing / f"expected-{PREPROCESS_SIZE}.bin")

    model_dir = FIXTURES / "models" / "testcrop"
    model_dir.mkdir(parents=True, exist_ok=True)
    image_size = 32
    export_onnx(CalibratedClassifier(MeanColourNetwork(), temperature=1.0), image_size, model_dir / "model.onnx")
    metadata = {
        "crop": "TestCrop",
        "labelsVersion": 1,
        "modelVersion": "testcrop-fixture",
        "input": {
            "name": "image", "layout": "NCHW", "width": image_size, "height": image_size,
            "colorOrder": "RGB", "resize": "stretch", "interpolation": "bilinear",
            "scale": 1 / 255, "mean": list(IMAGENET_MEAN), "std": list(IMAGENET_STD),
        },
        "output": {"name": "probabilities"},
        "classes": [
            {"id": 0, "key": "red_disease", "name": "Red disease", "autoReleaseThreshold": 0.9},
            {"id": 1, "key": "green_disease", "name": "Green disease", "autoReleaseThreshold": None},
            {"id": 2, "key": "blue_disease", "name": "Blue disease", "autoReleaseThreshold": 0.5},
        ],
        "temperature": 1.0,
        "targetPrecision": 0.95,
    }
    (model_dir / "model.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Fixtures written to {FIXTURES}")


if __name__ == "__main__":
    main()
