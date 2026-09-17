"""Per-crop label files.

A label file is the contract between training and the backend: a class's ``id`` is its index in
the model's output, and its ``key`` is what the backend's disease knowledge base looks treatments
up by. Changing either for an existing class means bumping ``version`` and retraining.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from . import LABELS_DIR


@dataclass(frozen=True)
class LabelClass:
    id: int
    key: str
    name: str


@dataclass(frozen=True)
class CropLabels:
    crop: str
    version: int
    classes: tuple[LabelClass, ...]
    # source name -> (the source dataset's own label -> our class key)
    source_label_maps: dict[str, dict[str, str]]

    def class_for_key(self, key: str) -> LabelClass:
        for label_class in self.classes:
            if label_class.key == key:
                return label_class
        raise KeyError(f"{self.crop} has no class with key '{key}'.")

    def map_source_label(self, source: str, source_label: str) -> LabelClass:
        try:
            label_map = self.source_label_maps[source]
        except KeyError:
            raise KeyError(f"{self.crop} label file has no mapping for source '{source}'.") from None
        try:
            return self.class_for_key(label_map[source_label])
        except KeyError:
            raise KeyError(f"Source '{source}' label '{source_label}' is not mapped for {self.crop}.") from None


def parse_crop_labels(data: dict) -> CropLabels:
    classes = tuple(LabelClass(int(c["id"]), str(c["key"]), str(c["name"])) for c in data["classes"])

    ids = [c.id for c in classes]
    if sorted(ids) != list(range(len(classes))):
        raise ValueError(f"Class ids must be exactly 0..{len(classes) - 1} with no gaps or repeats; got {ids}.")

    keys = [c.key for c in classes]
    if len(set(keys)) != len(keys):
        raise ValueError(f"Class keys must be unique; got {keys}.")

    source_label_maps: dict[str, dict[str, str]] = {}
    for source, spec in data.get("sources", {}).items():
        label_map = {str(k): str(v) for k, v in spec["labelMap"].items()}
        unknown = sorted(set(label_map.values()) - set(keys))
        if unknown:
            raise ValueError(f"Source '{source}' maps to unknown class keys: {unknown}.")
        source_label_maps[source] = label_map

    return CropLabels(str(data["crop"]), int(data["version"]), classes, source_label_maps)


def load_crop_labels(crop: str, labels_dir: Path = LABELS_DIR) -> CropLabels:
    path = labels_dir / f"{crop.lower()}.json"
    with path.open(encoding="utf-8") as file:
        return parse_crop_labels(json.load(file))
