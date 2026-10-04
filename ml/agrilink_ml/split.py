"""Train / validation / test split that keeps class proportions and never splits a group."""

from __future__ import annotations

import random
from collections import defaultdict
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


def assign_class_balanced_splits(labels: Sequence[int], groups: Sequence[int], seed: int,
                                 val_share: float = 0.1, test_share: float = 0.1,
                                 tries: int = 2000) -> list[str]:
    """Splits each class on its own, giving whole groups to validation and test until each holds
    close to its share of that class.

    For datasets whose groups are large (a whole field plot can be a third of a class), stratified
    group k-fold cannot balance every class at once: one big group landing in a fold leaves another
    class with no validation photos. Every group here belongs to one class, so the classes can be
    solved separately, each a small subset-sum problem. Deterministic for a given seed.
    """
    if len(labels) != len(groups):
        raise ValueError("labels and groups must be the same length.")

    class_of_group: dict[int, int] = {}
    for label, group in zip(labels, groups):
        if class_of_group.setdefault(group, label) != label:
            raise ValueError(f"Group {group} holds photos of more than one class; drop or relabel them first.")

    sizes: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for label, group in zip(labels, groups):
        sizes[label][group] += 1

    split_of_group: dict[int, str] = {}
    for label, group_sizes in sizes.items():
        total = sum(group_sizes.values())
        rng = random.Random(f"{seed}-{label}")  # string seeds hash the same on every platform
        order = sorted(group_sizes)
        best_score, best_assignment = float("inf"), {}
        for _ in range(tries):
            rng.shuffle(order)
            held = {VALIDATION: 0, TEST: 0}
            targets = {VALIDATION: val_share * total, TEST: test_share * total}
            assignment: dict[int, str] = {}
            for group in order:
                for split in (TEST, VALIDATION):
                    new, now = held[split] + group_sizes[group], held[split]
                    # Take the group only if it brings this split closer to its target.
                    if abs(new - targets[split]) < abs(now - targets[split]):
                        held[split], assignment[group] = new, split
                        break
            score = sum(abs(held[split] - targets[split]) for split in held) / total
            if score < best_score:
                best_score, best_assignment = score, assignment
        for group in group_sizes:
            split_of_group[group] = best_assignment.get(group, TRAIN)

    return [split_of_group[group] for group in groups]
