import pytest

from agrilink_ml.labels import load_crop_labels, parse_crop_labels


def labels_data(**overrides):
    data = {
        "crop": "Cassava",
        "version": 1,
        "classes": [
            {"id": 0, "key": "blight", "name": "Blight"},
            {"id": 1, "key": "healthy", "name": "Healthy"},
        ],
        "sources": {"some-dataset": {"labelMap": {"a": "blight", "b": "healthy"}}},
    }
    data.update(overrides)
    return data


def test_committed_cassava_label_file_is_valid_and_maps_every_class():
    labels = load_crop_labels("cassava")

    assert labels.crop == "Cassava"
    mapped_keys = set(labels.source_label_maps["kaggle-cassava-2020"].values())
    assert mapped_keys == {c.key for c in labels.classes}


def test_maps_a_source_label_to_our_class():
    labels = parse_crop_labels(labels_data())

    assert labels.map_source_label("some-dataset", "b").id == 1


def test_unmapped_source_label_is_an_error():
    labels = parse_crop_labels(labels_data())

    with pytest.raises(KeyError):
        labels.map_source_label("some-dataset", "zzz")


@pytest.mark.parametrize("ids", [[0, 0], [0, 2], [1, 2]])
def test_class_ids_must_be_consecutive_from_zero(ids):
    classes = [{"id": i, "key": f"k{n}", "name": "x"} for n, i in enumerate(ids)]

    with pytest.raises(ValueError):
        parse_crop_labels(labels_data(classes=classes, sources={}))


def test_source_mapping_to_an_unknown_class_is_rejected():
    with pytest.raises(ValueError):
        parse_crop_labels(labels_data(sources={"some-dataset": {"labelMap": {"a": "not_a_class"}}}))
