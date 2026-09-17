"""Builds a crop's training manifest from its raw datasets.

Usage (from the ml/ folder):

    .venv/Scripts/python -m agrilink_ml.prepare --crop cassava \
        --source kaggle-cassava-2020=C:/path/to/cassava-leaf-disease-classification.zip

Writes manifests/<crop>.csv (one row per usable image, with its class and split) and
manifests/<crop>_summary.md. Both are committed, so every training run - local, Kaggle or Colab -
uses exactly the same split.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from . import MANIFESTS_DIR
from .dedupe import difference_hash, group_near_duplicates, merge_groups
from .labels import CropLabels, load_crop_labels
from .sources import HASH_GROUPING_UNRELIABLE_SOURCES, SOURCE_ADAPTERS, DatasetReader
from .split import TEST, TRAIN, VALIDATION, assign_splits

MANIFEST_COLUMNS = ["source", "path", "label_id", "label_key", "split", "group_id", "sha1", "dhash"]


@dataclass
class ManifestRow:
    source: str
    path: str
    label_id: int
    label_key: str
    sha1: str
    dhash: int
    group_id: int = -1
    split: str = ""
    group_key: str | None = None


def collect_rows(labels: CropLabels, sources: dict[str, Path],
                 log=print) -> tuple[list[ManifestRow], list[str], Counter]:
    """Rows for every image whose label the crop's label file maps. A dataset may hold several crops
    (PlantVillage folders cover tomato and potato), so other labels are skipped and counted."""
    rows: list[ManifestRow] = []
    unreadable: list[str] = []
    skipped: Counter = Counter()

    for source, root in sources.items():
        if source not in SOURCE_ADAPTERS:
            raise ValueError(f"No adapter for source '{source}'. Known: {sorted(SOURCE_ADAPTERS)}.")

        if source not in labels.source_label_maps:
            raise ValueError(f"The {labels.crop} label file has no mapping for source '{source}'.")
        label_map = labels.source_label_maps[source]

        with DatasetReader(root) as reader:
            images = SOURCE_ADAPTERS[source](reader)
            log(f"{source}: {len(images)} images listed; hashing...")
            for index, image in enumerate(images, start=1):
                if image.source_label not in label_map:
                    skipped[f"{source}: {image.source_label}"] += 1
                    continue
                label_class = labels.map_source_label(source, image.source_label)
                content = reader.read_bytes(image.path)
                try:
                    dhash = difference_hash(content)
                except Exception:  # corrupt or unsupported file — excluded and reported
                    unreadable.append(f"{source}:{image.path}")
                    continue

                rows.append(ManifestRow(
                    source=source,
                    path=image.path,
                    label_id=label_class.id,
                    label_key=label_class.key,
                    sha1=hashlib.sha1(content).hexdigest(),
                    dhash=dhash,
                    group_key=f"{source}:{image.group_key}" if image.group_key else None,
                ))
                if index % 2000 == 0:
                    log(f"  {index}/{len(images)}")

    return rows, unreadable, skipped


def group_duplicates(rows: list[ManifestRow], max_distance: int) -> list[int]:
    """A group id per row. Rows share a group when they are byte-identical files, photos the dataset
    names as the same leaf, or — for sources where it is reliable — near-identical by image hash."""
    group_ids = list(range(len(rows)))
    hashable = [index for index, row in enumerate(rows) if row.source not in HASH_GROUPING_UNRELIABLE_SOURCES]
    near = group_near_duplicates([rows[index].dhash for index in hashable], max_distance)
    for index, group in zip(hashable, near):
        group_ids[index] = len(rows) + group  # offset so hash groups never collide with singletons

    group_ids = merge_groups(group_ids, [row.sha1 for row in rows])
    return merge_groups(group_ids, [row.group_key for row in rows])


def conflicting_label_groups(rows: list[ManifestRow]) -> dict[int, set[str]]:
    """Groups of (near-)identical photos that carry different labels — likely label noise."""
    keys_by_group: dict[int, set[str]] = {}
    for row in rows:
        keys_by_group.setdefault(row.group_id, set()).add(row.label_key)
    return {group: keys for group, keys in keys_by_group.items() if len(keys) > 1}


def write_manifest(rows: list[ManifestRow], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(MANIFEST_COLUMNS)
        for row in sorted(rows, key=lambda r: (r.source, r.path)):
            writer.writerow([row.source, row.path, row.label_id, row.label_key, row.split,
                             row.group_id, row.sha1, f"{row.dhash:016x}"])


def build_summary(labels: CropLabels, rows: list[ManifestRow], unreadable: list[str],
                  max_distance: int, seed: int, skipped: Counter | None = None,
                  dropped: list[ManifestRow] | None = None) -> str:
    splits = [TRAIN, VALIDATION, TEST]
    counts = Counter((row.label_key, row.split) for row in rows)
    group_sizes = Counter(row.group_id for row in rows)
    duplicate_groups = [size for size in group_sizes.values() if size > 1]
    exact_duplicates = len(rows) - len({row.sha1 for row in rows})

    lines = [
        f"# {labels.crop} dataset summary",
        "",
        f"Generated by `agrilink_ml.prepare` - label file version {labels.version}, seed {seed}, "
        f"near-duplicate distance <= {max_distance} bits "
        f"(not applied to {', '.join(sorted(HASH_GROUPING_UNRELIABLE_SOURCES))}).",
        "",
        "| Class | " + " | ".join(splits) + " | Total |",
        "|---|" + "---:|" * (len(splits) + 1),
    ]
    for label_class in labels.classes:
        per_split = [counts[(label_class.key, split)] for split in splits]
        lines.append(f"| {label_class.name} | " + " | ".join(map(str, per_split)) + f" | {sum(per_split)} |")
    split_totals = [sum(counts[(c.key, split)] for c in labels.classes) for split in splits]
    lines.append("| **Total** | " + " | ".join(map(str, split_totals)) + f" | {len(rows)} |")

    lines += [
        "",
        "## Data quality",
        "",
        f"- Unreadable images excluded: {len(unreadable)}",
        f"- Exact duplicate files (same bytes): {exact_duplicates}",
        f"- Duplicate groups (identical or near-identical photos, or photos of the same leaf): {len(duplicate_groups)} groups covering {sum(duplicate_groups)} images "
        f"(largest group: {max(group_sizes.values(), default=0)} images). Each group is kept in a single split.",
        f"- Photos left out because a duplicate of them carries a different label: {len(dropped or [])}",
    ]
    for row in sorted(dropped or [], key=lambda r: (r.group_id, r.path))[:40]:
        lines.append(f"  - group {row.group_id}: {row.label_key} - {row.source}:{row.path}")
    if dropped and len(dropped) > 40:
        lines.append(f"  - ...and {len(dropped) - 40} more")
    if skipped:
        lines.append(f"- Images skipped because their label is not a {labels.crop} class: {sum(skipped.values())}")
        lines += [f"  - {label}: {count}" for label, count in sorted(skipped.items())]
    sources = Counter(row.source for row in rows)
    if len(sources) > 1:
        lines.append("- Images per source: " + ", ".join(f"{name} {count}" for name, count in sorted(sources.items())))
    if unreadable:
        lines += ["", "## Unreadable images", ""] + [f"- {path}" for path in unreadable]

    return "\n".join(lines) + "\n"


def parse_sources(values: list[str]) -> dict[str, Path]:
    sources: dict[str, Path] = {}
    for value in values:
        name, separator, path = value.partition("=")
        if not separator or not name or not path:
            raise argparse.ArgumentTypeError(f"--source must look like name=path, got '{value}'.")
        sources[name] = Path(path)
    return sources


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--crop", required=True, help="Crop whose label file to use, e.g. cassava.")
    parser.add_argument("--source", action="append", required=True, metavar="NAME=PATH",
                        help="A raw dataset: adapter name and its zip or extracted folder. Repeatable.")
    # 2 bits catches resized or recompressed copies. On the Cassava field photos, pairs at 3-6 bits
    # were checked by eye and were different plants, and 8+ bits chains unrelated photos into groups
    # of hundreds — so re-check visually before loosening this for a new dataset.
    parser.add_argument("--near-duplicate-distance", type=int, default=2,
                        help="Max differing dHash bits for two images to count as near-duplicates.")
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--output-dir", type=Path, default=MANIFESTS_DIR)
    args = parser.parse_args(argv)

    labels = load_crop_labels(args.crop)
    rows, unreadable, skipped = collect_rows(labels, parse_sources(args.source))
    if not rows:
        print("No usable images found.", file=sys.stderr)
        return 1

    print(f"Grouping duplicates among {len(rows)} images...")
    for row, group_id in zip(rows, group_duplicates(rows, args.near_duplicate_distance)):
        row.group_id = group_id

    # The same photo filed under two diseases cannot be trusted either way, and would teach the model
    # contradictory answers — so every photo in such a group is left out.
    conflicts = conflicting_label_groups(rows)
    dropped = [row for row in rows if row.group_id in conflicts]
    rows = [row for row in rows if row.group_id not in conflicts]

    splits = assign_splits([row.label_id for row in rows], [row.group_id for row in rows], seed=args.seed)
    for row, split in zip(rows, splits):
        row.split = split

    crop = args.crop.lower()
    write_manifest(rows, args.output_dir / f"{crop}.csv")
    summary = build_summary(labels, rows, unreadable, args.near_duplicate_distance, args.seed, skipped, dropped)
    (args.output_dir / f"{crop}_summary.md").write_text(summary, encoding="utf-8")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
