import io
from collections import Counter

import numpy as np
from PIL import Image, ImageEnhance

from agrilink_ml.dedupe import difference_hash, group_near_duplicates, hamming_distance
from agrilink_ml.split import TEST, TRAIN, VALIDATION, assign_splits


def jpeg_bytes(image: Image.Image, quality: int = 90) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    return buffer.getvalue()


def random_photo(seed: int, size=(320, 240)) -> Image.Image:
    rng = np.random.default_rng(seed)
    # Smooth random structure (not pure noise), so hashes behave like they do on real photos.
    small = rng.integers(0, 256, size=(6, 8, 3), dtype=np.uint8)
    return Image.fromarray(small).resize(size, Image.Resampling.BICUBIC)


def test_recompressed_and_resized_copy_hashes_as_near_duplicate():
    original = random_photo(1)
    copy = ImageEnhance.Brightness(original.resize((200, 150))).enhance(1.05)

    distance = hamming_distance(difference_hash(jpeg_bytes(original)), difference_hash(jpeg_bytes(copy, quality=60)))

    assert distance <= 2  # the prepare script's default near-duplicate distance


def test_different_photos_hash_far_apart():
    distance = hamming_distance(difference_hash(jpeg_bytes(random_photo(1))), difference_hash(jpeg_bytes(random_photo(2))))

    assert distance > 10


def test_grouping_is_transitive_and_leaves_distinct_hashes_alone():
    a = 0b0000
    b = 0b0011  # 2 bits from a
    c = 0b1111  # 2 bits from b, 4 from a
    far = (1 << 64) - 1

    groups = group_near_duplicates([a, b, c, far], max_distance=2, chunk_size=2)

    assert groups[0] == groups[1] == groups[2]
    assert groups[3] != groups[0]


def test_splits_keep_groups_together_and_every_class_in_every_split():
    rng = np.random.default_rng(0)
    labels, groups = [], []
    for group in range(600):
        label = group % 3
        size = int(rng.integers(1, 4))
        labels += [label] * size
        groups += [group] * size

    splits = assign_splits(labels, groups, seed=13)

    split_of_group = {}
    for group, split in zip(groups, splits):
        assert split_of_group.setdefault(group, split) == split

    counts = Counter(splits)
    assert 0.7 < counts[TRAIN] / len(splits) < 0.9
    for split in (TRAIN, VALIDATION, TEST):
        assert {label for label, s in zip(labels, splits) if s == split} == {0, 1, 2}


def test_splits_are_reproducible_for_the_same_seed():
    labels = [i % 2 for i in range(200)]
    groups = list(range(200))

    assert assign_splits(labels, groups, seed=5) == assign_splits(labels, groups, seed=5)
