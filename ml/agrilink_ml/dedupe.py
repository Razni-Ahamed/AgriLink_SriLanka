"""Duplicate and near-duplicate detection.

Photo datasets often contain the same photo twice, or several shots of the same leaf. If those land
in different splits, the test score measures memorisation rather than diagnosis. Near-duplicates
are found with a difference hash (dHash) and grouped, and a whole group always goes to one split.
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image

HASH_SIZE = 8  # 8x8 comparisons -> a 64-bit hash


def difference_hash(image_bytes: bytes) -> int:
    """64-bit dHash: shrink to 9x8 greyscale and record whether each pixel is brighter than its
    right-hand neighbour. Robust to resizing, recompression and small brightness changes."""
    with Image.open(io.BytesIO(image_bytes)) as image:
        image.draft("L", (HASH_SIZE * 8, HASH_SIZE * 8))  # fast JPEG downscale while decoding
        pixels = np.asarray(
            image.convert("L").resize((HASH_SIZE + 1, HASH_SIZE), Image.Resampling.BILINEAR),
            dtype=np.int16,
        )

    bits = (pixels[:, :-1] > pixels[:, 1:]).flatten()
    return int(np.packbits(bits).view(">u8")[0])


def hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def group_near_duplicates(hashes: list[int], max_distance: int, chunk_size: int = 512) -> list[int]:
    """Returns a group id per hash. Hashes within ``max_distance`` bits of each other share a group,
    transitively (if A~B and B~C, all three are one group)."""
    count = len(hashes)
    parent = list(range(count))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    values = np.array(hashes, dtype=np.uint64)
    for start in range(0, count, chunk_size):
        stop = min(start + chunk_size, count)
        distances = np.bitwise_count(values[start:stop, None] ^ values[None, :])
        rows, cols = np.nonzero(distances <= max_distance)
        for row, col in zip(rows + start, cols):
            if col > row:
                root_a, root_b = find(row), find(col)
                if root_a != root_b:
                    parent[max(root_a, root_b)] = min(root_a, root_b)

    # Renumber to small consecutive ids in order of first appearance.
    renumbered: dict[int, int] = {}
    return [renumbered.setdefault(find(i), len(renumbered)) for i in range(count)]
