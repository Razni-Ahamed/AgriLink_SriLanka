import csv
import io
import json
import zipfile

import numpy as np
import pytest
from PIL import Image

from agrilink_ml import prepare
from agrilink_ml.sources import DatasetReader, read_kaggle_cassava_2020


def jpeg(seed: int) -> bytes:
    rng = np.random.default_rng(seed)
    image = Image.fromarray(rng.integers(0, 256, size=(6, 8, 3), dtype=np.uint8)).resize((160, 120))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def write_fake_cassava(root, count=60, as_zip=False, drop_image=None):
    files = {"train.csv": "image_id,label\n" + "".join(f"{i}.jpg,{i % 5}\n" for i in range(count))}
    for i in range(count):
        if i != drop_image:
            files[f"train_images/{i}.jpg"] = jpeg(i)

    if as_zip:
        path = root / "cassava.zip"
        with zipfile.ZipFile(path, "w") as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        return path

    for name, content in files.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content.encode() if isinstance(content, str) else content)
    return root


@pytest.mark.parametrize("as_zip", [False, True])
def test_cassava_adapter_reads_folder_or_zip(tmp_path, as_zip):
    root = write_fake_cassava(tmp_path, count=5, as_zip=as_zip)

    with DatasetReader(root) as reader:
        images = read_kaggle_cassava_2020(reader)

    assert [(i.path, i.source_label) for i in images][:2] == [("train_images/0.jpg", "0"), ("train_images/1.jpg", "1")]


def test_cassava_adapter_reports_images_missing_from_the_download(tmp_path):
    root = write_fake_cassava(tmp_path, count=5, drop_image=3)

    with DatasetReader(root) as reader, pytest.raises(ValueError, match="missing"):
        read_kaggle_cassava_2020(reader)


def test_prepare_writes_a_manifest_and_summary_covering_every_image(tmp_path):
    (tmp_path / "raw").mkdir()
    dataset = write_fake_cassava(tmp_path / "raw", count=60, as_zip=True)
    output = tmp_path / "manifests"

    exit_code = prepare.main([
        "--crop", "cassava",
        "--source", f"kaggle-cassava-2020={dataset}",
        "--output-dir", str(output),
    ])

    assert exit_code == 0
    with (output / "cassava.csv").open(encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 60
    assert {row["split"] for row in rows} == {"train", "val", "test"}
    assert all(row["label_key"] for row in rows)
    assert (output / "cassava_summary.md").read_text(encoding="utf-8").startswith("# Cassava dataset summary")


def test_near_identical_photos_with_different_labels_are_reported_as_conflicts():
    rows = [
        prepare.ManifestRow("s", "a.jpg", 0, "blight", "x", 1, group_id=7),
        prepare.ManifestRow("s", "b.jpg", 4, "healthy", "y", 1, group_id=7),
        prepare.ManifestRow("s", "c.jpg", 4, "healthy", "z", 2, group_id=8),
    ]

    assert prepare.conflicting_label_groups(rows) == {7: {"blight", "healthy"}}
