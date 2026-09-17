"""End-to-end run of training and export on a tiny fake dataset: catches broken wiring (data
loading, calibration, ONNX export and its parity check, metadata) before a real training run."""

import json

import pytest

pytest.importorskip("torch")
pytest.importorskip("timm")
pytest.importorskip("onnxruntime")

from agrilink_ml import prepare, train  # noqa: E402

from .test_prepare import write_fake_cassava  # noqa: E402


def test_training_writes_a_verified_onnx_model_and_complete_metadata(tmp_path):
    (tmp_path / "raw").mkdir()
    dataset = write_fake_cassava(tmp_path / "raw", count=80, as_zip=True)
    source = f"kaggle-cassava-2020={dataset}"
    assert prepare.main(["--crop", "cassava", "--source", source, "--output-dir", str(tmp_path / "manifests")]) == 0

    output = tmp_path / "model"
    exit_code = train.main([
        "--crop", "cassava", "--source", source,
        "--manifest", str(tmp_path / "manifests" / "cassava.csv"),
        "--output-dir", str(output),
        "--no-pretrained", "--architecture", "resnet18",
        "--image-size", "32", "--epochs", "1", "--batch-size", "8", "--workers", "0",
    ])

    assert exit_code == 0
    for name in ("model.onnx", "model.json", "report.md", "history.csv", "best.pt"):
        assert (output / name).exists(), name

    metadata = json.loads((output / "model.json").read_text(encoding="utf-8"))
    assert [c["key"] for c in metadata["classes"]][-1] == "healthy"
    assert metadata["input"]["width"] == 32
    assert metadata["temperature"] > 0
    for label_class in metadata["classes"]:
        threshold = label_class["autoReleaseThreshold"]
        assert threshold is None or 0 < threshold <= 1
    assert metadata["training"]["onnxMaxDifference"] <= 1e-4
    assert set(metadata["metrics"]) == {"validation", "test", "testBySource"}
    assert metadata["metrics"]["testBySource"] == {}  # one dataset only: no per-dataset breakdown
