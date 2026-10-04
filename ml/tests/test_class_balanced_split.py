import collections

import pytest

from agrilink_ml.split import TEST, TRAIN, VALIDATION, assign_class_balanced_splits


def photos(sizes_by_class):
    """(labels, groups) for classes made of groups of the given sizes."""
    labels, groups, next_group = [], [], 0
    for label, sizes in sizes_by_class.items():
        for size in sizes:
            labels += [label] * size
            groups += [next_group] * size
            next_group += 1
    return labels, groups


def shares(labels, splits):
    counts = collections.Counter(zip(labels, splits))
    totals = collections.Counter(labels)
    return {(label, split): counts[(label, split)] / totals[label] for label in totals for split in (TRAIN, VALIDATION, TEST)}


def test_every_class_gets_close_to_its_share_even_when_one_group_is_most_of_it():
    # Stratified group k-fold leaves classes like these with 0 validation photos or 30% test photos.
    labels, groups = photos({0: [675, 332, 238, 181, 86, 53, 49, 30, 20, 10, 8, 6],
                             1: [169, 69, 56, 22, 21, 14, 13, 8],
                             2: [122, 63, 52, 34, 32, 14, 8, 6, 4]})

    splits = assign_class_balanced_splits(labels, groups, seed=13)

    got = shares(labels, splits)
    for label in (0, 1, 2):
        assert got[(label, VALIDATION)] == pytest.approx(0.10, abs=0.02)
        assert got[(label, TEST)] == pytest.approx(0.10, abs=0.02)


def test_a_group_is_never_split():
    labels, groups = photos({0: [40, 30, 20, 10, 5, 5], 1: [50, 25, 25, 10, 10]})

    splits = assign_class_balanced_splits(labels, groups, seed=3)

    split_of_group = {}
    for group, split in zip(groups, splits):
        assert split_of_group.setdefault(group, split) == split


def test_the_same_seed_gives_the_same_split_and_another_seed_may_differ():
    labels, groups = photos({0: [30, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3, 2]})

    first = assign_class_balanced_splits(labels, groups, seed=1)

    assert assign_class_balanced_splits(labels, groups, seed=1) == first
    assert any(assign_class_balanced_splits(labels, groups, seed=seed) != first for seed in range(2, 12))


def test_a_class_made_of_one_group_stays_in_training():
    labels, groups = photos({0: [100], 1: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]})

    splits = assign_class_balanced_splits(labels, groups, seed=1)

    assert {split for label, split in zip(labels, splits) if label == 0} == {TRAIN}


def test_a_group_holding_two_classes_is_rejected():
    with pytest.raises(ValueError, match="more than one class"):
        assign_class_balanced_splits([0, 1], [7, 7], seed=1)


def test_labels_and_groups_must_match_in_length():
    with pytest.raises(ValueError):
        assign_class_balanced_splits([0, 1], [0], seed=1)
