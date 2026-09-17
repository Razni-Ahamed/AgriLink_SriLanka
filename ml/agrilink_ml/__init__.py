"""Data preparation for AgriLink's crop disease photo classifiers."""

from pathlib import Path

ML_ROOT = Path(__file__).resolve().parent.parent
LABELS_DIR = ML_ROOT / "labels"
MANIFESTS_DIR = ML_ROOT / "manifests"
