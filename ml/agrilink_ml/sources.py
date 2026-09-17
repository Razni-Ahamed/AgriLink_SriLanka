"""Reading the raw datasets.

Each dataset gets an adapter that lists its images and each image's label *in that dataset's own
terms*; the crop's label file then maps those to our classes. Paths are stored relative to the
dataset root, so the same manifest works for the local copy (zip or extracted folder) and for the
copy a Kaggle or Colab notebook mounts.
"""

from __future__ import annotations

import csv
import io
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass(frozen=True)
class SourceImage:
    source: str
    path: str  # relative to the dataset root, always with forward slashes
    source_label: str


class DatasetReader:
    """Reads files from a dataset root that is either a .zip archive or an extracted folder."""

    def __init__(self, root: Path):
        self.root = Path(root)
        if not self.root.exists():
            raise FileNotFoundError(f"Dataset not found at {self.root}.")
        self._zip = zipfile.ZipFile(self.root) if self.root.is_file() else None

    def close(self) -> None:
        if self._zip is not None:
            self._zip.close()

    def __enter__(self) -> DatasetReader:
        return self

    def __exit__(self, *_exc) -> None:
        self.close()

    def exists(self, path: str) -> bool:
        if self._zip is not None:
            try:
                self._zip.getinfo(path)
                return True
            except KeyError:
                return False
        return (self.root / path).is_file()

    def read_bytes(self, path: str) -> bytes:
        if self._zip is not None:
            return self._zip.read(path)
        return (self.root / path).read_bytes()

    def read_text(self, path: str) -> str:
        return self.read_bytes(path).decode("utf-8-sig")


def read_kaggle_cassava_2020(reader: DatasetReader) -> list[SourceImage]:
    """Kaggle 'Cassava Leaf Disease Classification': train.csv (image_id, label) + train_images/."""
    rows = list(csv.DictReader(io.StringIO(reader.read_text("train.csv"))))
    if not rows or {"image_id", "label"} - set(rows[0]):
        raise ValueError("train.csv is missing or does not have image_id and label columns.")

    images = [SourceImage("kaggle-cassava-2020", f"train_images/{row['image_id']}", row["label"]) for row in rows]

    missing = [image.path for image in images if not reader.exists(image.path)]
    if missing:
        raise ValueError(f"{len(missing)} images listed in train.csv are missing, e.g. {missing[:3]}.")

    return images


SOURCE_ADAPTERS: dict[str, Callable[[DatasetReader], list[SourceImage]]] = {
    "kaggle-cassava-2020": read_kaggle_cassava_2020,
}
