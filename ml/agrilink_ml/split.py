"""Train / validation / test split that keeps class proportions and never splits a group."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold

TRAIN, VALIDATION, TEST = "train", "val", "test"


def assign_splits(labels: Sequence[int], groups: Sequence[int], seed: int, folds: int = 10) -> list[str]:
    """Roughly (folds-2)/folds train, 1/folds validation, 1/folds test — 80/10/10 by default.

    Uses stratified group k-fold: each group's samples land in exactly one fold, and folds are
    balanced by class as closely as the groups allow. One fold becomes test, one validation.
    """
    if len(labels) != len(groups):
        raise ValueError("labels and groups must be the same length.")

    splitter = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    fold_of = np.empty(len(labels), dtype=np.int64)
    placeholder_features = np.zeros((len(labels), 1))
    for fold, (_, held_out) in enumerate(splitter.split(placeholder_features, labels, groups)):
        fold_of[held_out] = fold

    return [TEST if fold == 0 else VALIDATION if fold == 1 else TRAIN for fold in fold_of]
