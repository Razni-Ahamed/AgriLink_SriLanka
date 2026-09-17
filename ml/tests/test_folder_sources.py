"""PlantVillage, PlantDoc and Mendeley rice store one folder per class; a dataset may also hold
classes for other crops, and PlantVillage photographed some leaves more than once."""

import csv
import io

import numpy as np
from PIL import Image

from agrilink_ml import prepare
from agrilink_ml.dedupe import merge_groups
from agrilink_ml.sources import (
    DatasetReader,
    read_plantdoc_2020,
    read_plantvillage_2016,
    read_rice_mendeley_2020,
)


def jpeg(seed: int) -> bytes:
    rng = np.random.default_rng(seed)
    image = Image.fromarray(rng.integers(0, 256, size=(6, 8, 3), dtype=np.uint8)).resize((160, 120))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def write(root, relative_path, content=b"x"):
    target = root / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def test_plantvillage_labels_by_folder_and_groups_photos_of_the_same_leaf(tmp_path):
    write(tmp_path, "raw/color/Tomato___healthy/0a1b-uuid___GH_HL Leaf 259.JPG")
    write(tmp_path, "raw/color/Tomato___healthy/9f8e-uuid___GH_HL Leaf 259.1.JPG")
    write(tmp_path, "raw/color/Tomato___healthy/77aa-uuid___GH_HL Leaf 300.JPG")
    write(tmp_path, "raw/color/Potato___healthy/1234-uuid___RS_HL 1864.JPG")
    write(tmp_path, "raw/color/Potato___healthy/notes.txt")

    with DatasetReader(tmp_path) as reader:
        images = {image.path.rsplit("/", 1)[-1]: image for image in read_plantvillage_2016(reader)}

    assert set(images) == {
        "0a1b-uuid___GH_HL Leaf 259.JPG",
        "9f8e-uuid___GH_HL Leaf 259.1.JPG",
        "77aa-uuid___GH_HL Leaf 300.JPG",
        "1234-uuid___RS_HL 1864.JPG",
    }
    assert images["0a1b-uuid___GH_HL Leaf 259.JPG"].source_label == "Tomato___healthy"
    assert (
        images["0a1b-uuid___GH_HL Leaf 259.JPG"].group_key
        == images["9f8e-uuid___GH_HL Leaf 259.1.JPG"].group_key
        == "Tomato___healthy/GH_HL Leaf 259"
    )
    assert images["77aa-uuid___GH_HL Leaf 300.JPG"].group_key == "Tomato___healthy/GH_HL Leaf 300"


def test_plantdoc_reads_both_its_train_and_test_folders(tmp_path):
    write(tmp_path, "train/Tomato leaf/a.jpg")
    write(tmp_path, "test/Tomato leaf late blight/b.png")
    write(tmp_path, "train/Tomato leaf/readme.md")

    with DatasetReader(tmp_path) as reader:
        images = read_plantdoc_2020(reader)

    assert sorted((image.path, image.source_label) for image in images) == [
        ("test/Tomato leaf late blight/b.png", "Tomato leaf late blight"),
        ("train/Tomato leaf/a.jpg", "Tomato leaf"),
    ]


def test_rice_mendeley_reads_its_class_folders(tmp_path):
    write(tmp_path, "Rice Leaf Disease Images/Blast/BLAST1_001.jpg")

    with DatasetReader(tmp_path) as reader:
        images = read_rice_mendeley_2020(reader)

    assert [(image.path, image.source_label) for image in images] == [
        ("Rice Leaf Disease Images/Blast/BLAST1_001.jpg", "Blast")
    ]


def test_merge_groups_joins_items_that_share_a_key():
    groups = merge_groups([0, 1, 2, 3], ["leaf-1", None, "leaf-1", "leaf-2"])

    assert groups[0] == groups[2]
    assert len({groups[0], groups[1], groups[3]}) == 3


def row(source, path, label_key, sha1, dhash, group_key=None):
    return prepare.ManifestRow(source, path, 0, label_key, sha1, dhash, group_key=group_key)


def test_look_alike_hashes_are_ignored_for_plantvillage_but_exact_copies_still_group():
    rows = [
        row("plantvillage-2016", "a.JPG", "tomato_bacterial_spot", "sha-a", 0b0000),
        row("plantvillage-2016", "b.JPG", "tomato_yellow_leaf_curl_virus", "sha-b", 0b0001),  # 1 bit away
        row("plantvillage-2016", "c.JPG", "healthy", "sha-c", 0xFF00),
        row("plantvillage-2016", "d.JPG", "healthy", "sha-c", 0xFF00),  # byte-identical to c
        row("plantdoc-2020", "e.jpg", "healthy", "sha-e", 0x0F0F),
        row("plantdoc-2020", "f.jpg", "healthy", "sha-f", 0x0F0E),  # 1 bit away, and hashing is reliable here
    ]

    groups = prepare.group_duplicates(rows, max_distance=2)

    assert groups[0] != groups[1]
    assert groups[2] == groups[3]
    assert groups[4] == groups[5]


def test_prepare_leaves_out_a_photo_filed_under_two_diseases(tmp_path):
    raw = tmp_path / "plantdoc"
    for n in range(12):
        write(raw, f"train/Potato leaf early blight/eb{n}.jpg", jpeg(100 + n))
        write(raw, f"train/Potato leaf late blight/lb{n}.jpg", jpeg(200 + n))
    write(raw, "train/Potato leaf early blight/same.jpg", jpeg(999))
    write(raw, "test/Potato leaf late blight/same.jpg", jpeg(999))
    output = tmp_path / "manifests"

    assert prepare.main(["--crop", "potato", "--source", f"plantdoc-2020={raw}", "--output-dir", str(output)]) == 0

    with (output / "potato.csv").open(encoding="utf-8") as file:
        paths = [r["path"] for r in csv.DictReader(file)]
    assert len(paths) == 24
    assert not any(path.endswith("same.jpg") for path in paths)
    summary = (output / "potato_summary.md").read_text(encoding="utf-8")
    assert "Photos left out because a duplicate of them carries a different label: 2" in summary


def test_prepare_skips_other_crops_folders_and_keeps_each_leaf_in_one_split(tmp_path):
    raw = tmp_path / "plantvillage"
    seed = 0
    for disease, key in [("Early_blight", "EB"), ("Late_blight", "LB"), ("healthy", "HL")]:
        for leaf in range(20):
            for view in ("", ".1"):  # every leaf photographed twice
                seed += 1
                write(raw, f"raw/color/Potato___{disease}/{seed:04d}-uuid___RS_{key} {leaf}{view}.JPG", jpeg(seed))
    for n in range(5):
        seed += 1
        write(raw, f"raw/color/Tomato___healthy/{seed:04d}-uuid___GH_HL Leaf {n}.JPG", jpeg(seed))
    output = tmp_path / "manifests"

    exit_code = prepare.main([
        "--crop", "potato", "--source", f"plantvillage-2016={raw}", "--output-dir", str(output),
    ])

    assert exit_code == 0
    with (output / "potato.csv").open(encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 120
    assert not any("Tomato" in row["path"] for row in rows)

    split_of_leaf = {}
    for row in rows:
        leaf = row["path"].rsplit("___", 1)[1].removesuffix(".JPG").removesuffix(".1")
        assert split_of_leaf.setdefault((row["label_key"], leaf), row["split"]) == row["split"]

    summary = (output / "potato_summary.md").read_text(encoding="utf-8")
    assert "Images skipped because their label is not a Potato class: 5" in summary
    assert "plantvillage-2016: Tomato___healthy: 5" in summary
