"""AgriLink's own export of officer-confirmed photo diagnoses (the admin dashboard's zip):
<Crop>/<confirmed key>/<issue>-<image>.jpg plus labels.csv and README.txt."""

import csv
import zipfile

import pytest

from agrilink_ml import prepare
from agrilink_ml.labels import load_crop_labels
from agrilink_ml.sources import DatasetReader, read_agrilink_confirmed

from .test_folder_sources import jpeg, write


def write_export(root):
    write(root, "labels.csv", b"path,crop,confirmed_key\n")
    write(root, "README.txt", b"AgriLink export")
    write(root, "Tomato/tomato_late_blight/12-31.jpg", jpeg(1))
    write(root, "Tomato/tomato_late_blight/12-32.jpg", jpeg(2))  # a second photo of issue 12
    write(root, "Tomato/healthy/13-33.jpg", jpeg(3))
    write(root, "Potato/healthy/14-34.jpg", jpeg(4))
    write(root, "Tomato/other/15-35.jpg", jpeg(5))


@pytest.mark.parametrize("label_file", ["cassava", "paddy", "potato", "tomato"])
def test_every_committed_label_file_maps_every_class_for_confirmed_photos(label_file):
    labels = load_crop_labels(label_file)

    label_map = labels.source_label_maps["agrilink-confirmed"]
    assert set(label_map.values()) == {c.key for c in labels.classes}
    assert all(source.startswith(f"{label_file}/") for source in label_map)
    assert f"{label_file}/other" not in label_map


def test_confirmed_photos_are_labelled_by_crop_and_key_and_grouped_by_issue(tmp_path):
    write_export(tmp_path)

    with DatasetReader(tmp_path) as reader:
        images = {image.path: image for image in read_agrilink_confirmed(reader)}

    assert set(images) == {
        "Tomato/tomato_late_blight/12-31.jpg",
        "Tomato/tomato_late_blight/12-32.jpg",
        "Tomato/healthy/13-33.jpg",
        "Potato/healthy/14-34.jpg",
        "Tomato/other/15-35.jpg",
    }
    assert images["Potato/healthy/14-34.jpg"].source_label == "potato/healthy"
    assert images["Tomato/tomato_late_blight/12-31.jpg"].group_key == images["Tomato/tomato_late_blight/12-32.jpg"].group_key
    assert images["Tomato/healthy/13-33.jpg"].group_key != images["Tomato/tomato_late_blight/12-31.jpg"].group_key


def test_the_export_zip_can_be_read_directly(tmp_path):
    folder = tmp_path / "export"
    write_export(folder)
    archive = tmp_path / "agrilink-confirmed-photos.zip"
    with zipfile.ZipFile(archive, "w") as out:
        for file in folder.rglob("*"):
            if file.is_file():
                out.write(file, file.relative_to(folder).as_posix())

    with DatasetReader(archive) as reader:
        assert len(read_agrilink_confirmed(reader)) == 5


def test_a_folder_without_photos_is_refused(tmp_path):
    write(tmp_path, "labels.csv", b"path\n")

    with DatasetReader(tmp_path) as reader, pytest.raises(ValueError, match="No photos found"):
        read_agrilink_confirmed(reader)


def test_prepare_takes_only_this_crops_confirmed_photos_and_skips_other(tmp_path):
    raw = tmp_path / "confirmed"
    write_export(raw)
    for n in range(20):  # enough issues for a train/validation/test split
        issue = 100 + n
        key = "tomato_late_blight" if n % 2 else "healthy"
        write(raw, f"Tomato/{key}/{issue}-{issue}.jpg", jpeg(issue))
    output = tmp_path / "manifests"

    assert prepare.main(["--crop", "tomato", "--source", f"agrilink-confirmed={raw}", "--output-dir", str(output)]) == 0

    with (output / "tomato.csv").open(encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 23
    assert {r["label_key"] for r in rows} == {"healthy", "tomato_late_blight"}
    issue_12 = {r["split"] for r in rows if "/12-" in r["path"]}
    assert len(issue_12) == 1  # both photos of one issue land in the same split
    summary = (output / "tomato_summary.md").read_text(encoding="utf-8")
    assert "agrilink-confirmed: potato/healthy: 1" in summary
    assert "agrilink-confirmed: tomato/other: 1" in summary
