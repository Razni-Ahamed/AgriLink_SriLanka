"""Kaggle's Paddy Doctor data: train.csv gives each photo's disease, variety and age, and the photos
of one disease from one variety at one age come from the same plot on the same day."""

import csv
import io

import pytest

from agrilink_ml import prepare
from agrilink_ml.labels import load_crop_labels
from agrilink_ml.sources import DatasetReader, read_kaggle_paddy_2022

from .test_folder_sources import jpeg, write


def write_train_csv(root, rows, columns=("image_id", "label", "variety", "age")):
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(columns)
    writer.writerows(rows)
    write(root, "train.csv", buffer.getvalue().encode("utf-8"))


def test_committed_paddy_label_file_is_valid_and_maps_every_class():
    labels = load_crop_labels("paddy")

    assert labels.crop == "Paddy"
    assert {c.key for c in labels.classes} == set(labels.source_label_maps["kaggle-paddy-2022"].values())
    assert labels.classes[-1].key == "healthy"  # the training smoke test and the backend expect it last


def test_paddy_photos_are_listed_with_their_plot(tmp_path):
    write_train_csv(tmp_path, [
        ("a.jpg", "blast", "ADT45", "60"),
        ("b.jpg", "blast", "ADT45", "60"),
        ("c.jpg", "blast", "ADT45", "70"),
        ("d.jpg", "normal", "ADT45", "60"),
    ])
    for name, label in [("a", "blast"), ("b", "blast"), ("c", "blast"), ("d", "normal")]:
        write(tmp_path, f"train_images/{label}/{name}.jpg")

    with DatasetReader(tmp_path) as reader:
        images = {image.path: image for image in read_kaggle_paddy_2022(reader)}

    assert set(images) == {
        "train_images/blast/a.jpg", "train_images/blast/b.jpg",
        "train_images/blast/c.jpg", "train_images/normal/d.jpg",
    }
    assert images["train_images/blast/a.jpg"].source_label == "blast"
    plot = {path: image.plot_key for path, image in images.items()}
    assert plot["train_images/blast/a.jpg"] == plot["train_images/blast/b.jpg"]
    assert plot["train_images/blast/a.jpg"] != plot["train_images/blast/c.jpg"]  # other age
    assert plot["train_images/blast/a.jpg"] != plot["train_images/normal/d.jpg"]  # other disease
    assert all(image.group_key is None for image in images.values())  # plots decide the split only


def test_paddy_without_variety_and_age_columns_still_loads_with_no_plot_groups(tmp_path):
    write_train_csv(tmp_path, [("a.jpg", "blast")], columns=("image_id", "label"))
    write(tmp_path, "train_images/blast/a.jpg")

    with DatasetReader(tmp_path) as reader:
        images = read_kaggle_paddy_2022(reader)

    assert [image.plot_key for image in images] == [None]


def test_paddy_rejects_a_train_csv_that_lists_a_missing_photo(tmp_path):
    write_train_csv(tmp_path, [("a.jpg", "blast", "ADT45", "60"), ("gone.jpg", "blast", "ADT45", "60")])
    write(tmp_path, "train_images/blast/a.jpg")

    with DatasetReader(tmp_path) as reader, pytest.raises(ValueError, match="1 images listed"):
        read_kaggle_paddy_2022(reader)


def test_prepare_keeps_every_plot_in_one_split(tmp_path):
    raw = tmp_path / "paddy"
    rows, seed = [], 0
    for label in ("blast", "normal"):
        for plot in range(12):  # sklearn needs at least as many groups as folds
            for shot in range(4):
                seed += 1
                name = f"{label}_{plot}_{shot}.jpg"
                rows.append((name, label, f"V{plot}", "50"))
                write(raw, f"train_images/{label}/{name}", jpeg(seed))
    write_train_csv(raw, rows)
    output = tmp_path / "manifests"

    exit_code = prepare.main(["--crop", "paddy", "--source", f"kaggle-paddy-2022={raw}", "--output-dir", str(output)])

    assert exit_code == 0
    with (output / "paddy.csv").open(encoding="utf-8") as file:
        manifest = list(csv.DictReader(file))
    assert len(manifest) == 96

    split_of_plot = {}
    for row in manifest:
        label, plot = row["path"].rsplit("/", 1)[1].split("_")[:2]
        assert split_of_plot.setdefault((label, plot), row["split"]) == row["split"]
    assert {row["label_key"] for row in manifest} == {"paddy_blast", "healthy"}


def test_a_few_mislabelled_twins_do_not_take_their_whole_plots_with_them(tmp_path):
    raw = tmp_path / "paddy"
    rows, seed = [], 0
    for label in ("blast", "normal"):
        for plot in range(12):
            for shot in range(4):
                seed += 1
                name = f"{label}_{plot}_{shot}.jpg"
                rows.append((name, label, f"V{plot}", "50"))
                write(raw, f"train_images/{label}/{name}", jpeg(seed))
    # One photo filed under both diseases, in two different plots: it links those plots' groups.
    twin = jpeg(9999)
    write(raw, "train_images/blast/blast_0_0.jpg", twin)
    write(raw, "train_images/normal/normal_0_0.jpg", twin)
    write_train_csv(raw, rows)
    output = tmp_path / "manifests"

    assert prepare.main(["--crop", "paddy", "--source", f"kaggle-paddy-2022={raw}", "--output-dir", str(output)]) == 0

    with (output / "paddy.csv").open(encoding="utf-8") as file:
        kept = {row["path"].rsplit("/", 1)[1] for row in csv.DictReader(file)}
    assert len(kept) == 94  # only the two contradictory copies are gone, not the plots they touch
    assert "blast_0_0.jpg" not in kept and "normal_0_0.jpg" not in kept
    assert {"blast_0_1.jpg", "normal_0_1.jpg"} <= kept
