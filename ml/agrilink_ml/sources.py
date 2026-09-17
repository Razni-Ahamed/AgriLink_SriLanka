"""Reading the raw datasets.

Each dataset gets an adapter that lists its images and each image's label *in that dataset's own
terms*; the crop's label file then maps those to our classes. Paths are stored relative to the
dataset root, so the same manifest works for the local copy (zip or extracted folder) and for the
copy a Kaggle or Colab notebook mounts.
"""

from __future__ import annotations

import csv
import io
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Callable

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Sources where a small image-hash distance does not mean "the same photo". PlantVillage shoots every
# leaf on the same grey background, and pairs at 2 bits apart, checked by eye, were different leaves
# from different disease folders. Its repeat photos are identified by leaf id instead (group_key),
# and byte-identical files are still grouped for every source.
HASH_GROUPING_UNRELIABLE_SOURCES = {"plantvillage-2016"}


@dataclass(frozen=True)
class SourceImage:
    source: str
    path: str  # relative to the dataset root, always with forward slashes
    source_label: str
    # Photos sharing a key show the same physical leaf (known from the dataset's own naming), so
    # they must stay in one split even when they do not look alike enough to be caught as duplicates.
    group_key: str | None = None


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

    def list_files(self, prefix: str = "") -> list[str]:
        """Every file under ``prefix``, as sorted forward-slash paths relative to the root."""
        if self._zip is not None:
            return sorted(n for n in self._zip.namelist() if n.startswith(prefix) and not n.endswith("/"))
        base = self.root / prefix if prefix else self.root
        if not base.is_dir():
            return []
        return sorted(p.relative_to(self.root).as_posix() for p in base.rglob("*") if p.is_file())


def _images_by_folder(reader: DatasetReader, prefix: str, depth: int) -> list[tuple[str, str]]:
    """(path, label) for each image whose label is the folder ``depth`` levels below ``prefix``."""
    found = []
    for path in reader.list_files(prefix):
        parts = PurePosixPath(path).parts
        if PurePosixPath(path).suffix.lower() in IMAGE_EXTENSIONS and len(parts) > depth + 1:
            found.append((path, parts[depth]))
    return found


# PlantVillage names files "<uuid>___<source leaf id>.JPG", and some leaves were photographed more
# than once: "GH_HL Leaf 259.JPG" and "GH_HL Leaf 259.1.JPG", or the same leaf id under two uuids.
_PLANTVILLAGE_LEAF_ID = re.compile(r"^[^_]+___(?P<leaf>.+?)(?:\.\d+)*\.[A-Za-z]+$")


def read_plantvillage_2016(reader: DatasetReader) -> list[SourceImage]:
    """PlantVillage (spMohanty/PlantVillage-Dataset): raw/color/<Crop___disease>/<image>."""
    images = []
    for path, label in _images_by_folder(reader, "raw/color/", depth=2):
        match = _PLANTVILLAGE_LEAF_ID.match(PurePosixPath(path).name)
        group_key = f"{label}/{match.group('leaf')}" if match else None
        images.append(SourceImage("plantvillage-2016", path, label, group_key))
    if not images:
        raise ValueError("No images found under raw/color/ — is this the PlantVillage-Dataset folder?")
    return images


def read_plantdoc_2020(reader: DatasetReader) -> list[SourceImage]:
    """PlantDoc (pratikkayal/PlantDoc-Dataset): train/<class>/<image> and test/<class>/<image>. Its
    own train/test split is ignored; the manifest assigns splits across all sources together."""
    images = [
        SourceImage("plantdoc-2020", path, label)
        for split in ("train/", "test/")
        for path, label in _images_by_folder(reader, split, depth=1)
    ]
    if not images:
        raise ValueError("No images found under train/ or test/ — is this the PlantDoc-Dataset folder?")
    return images


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


def read_rice_mendeley_2020(reader: DatasetReader) -> list[SourceImage]:
    """Mendeley 'Rice Leaf Disease Image Samples' (fwcj7stb8r), extracted from its .7z:
    Rice Leaf Disease Images/<class>/<image>. It has no healthy class."""
    images = [
        SourceImage("rice-mendeley-2020", path, label)
        for path, label in _images_by_folder(reader, "Rice Leaf Disease Images/", depth=1)
    ]
    if not images:
        raise ValueError("No images under 'Rice Leaf Disease Images/' — extract the .7z and pass that folder.")
    return images


SOURCE_ADAPTERS: dict[str, Callable[[DatasetReader], list[SourceImage]]] = {
    "rice-mendeley-2020": read_rice_mendeley_2020,
    "kaggle-cassava-2020": read_kaggle_cassava_2020,
    "plantvillage-2016": read_plantvillage_2016,
    "plantdoc-2020": read_plantdoc_2020,
}
