"""Model evaluation, confidence calibration and the auto-release thresholds.

The backend releases the agent's stored treatment to a farmer without waiting for an officer only
when the model's confidence in its top class is at or above that class's threshold, chosen here.
Thresholds are picked on the validation split so that, with ~95% statistical confidence, at least
``target_precision`` of the released predictions are correct; the test split then checks that
promise on photos not used to pick them.

Numpy-only on purpose, so it is testable without PyTorch.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize_scalar

# Fewer confident validation photos than this is too little evidence to trust a threshold at all;
# the class then gets no threshold (None) and every case of it goes to an officer.
MIN_CONFIDENT_SAMPLES = 30


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    scaled = logits / temperature
    scaled = scaled - scaled.max(axis=1, keepdims=True)
    exp = np.exp(scaled)
    return exp / exp.sum(axis=1, keepdims=True)


def fit_temperature(logits: np.ndarray, labels: np.ndarray) -> float:
    """Temperature scaling: the single T that makes softmax(logits / T) best match how often the
    model is actually right (minimum negative log-likelihood). It never changes which class is
    predicted, only how confident the model claims to be — which is what the threshold relies on."""

    def negative_log_likelihood(log_t: float) -> float:
        probs = softmax(logits, float(np.exp(log_t)))
        return float(-np.mean(np.log(probs[np.arange(len(labels)), labels] + 1e-12)))

    result = minimize_scalar(negative_log_likelihood, bounds=(np.log(0.05), np.log(20.0)), method="bounded")
    return float(np.exp(result.x))


@dataclass(frozen=True)
class ThresholdChoice:
    # None means no threshold met the target: never auto-release, always escalate to an officer.
    # (1.0 would not be safe for that — a saturated softmax can output exactly 1.0.)
    threshold: float | None
    precision: float  # share of predictions at or above the threshold that are correct
    coverage: float  # share of all photos at or above the threshold
    confident_count: int


def selective_metrics(probs: np.ndarray, labels: np.ndarray, threshold: float | None) -> ThresholdChoice:
    if threshold is None:
        return ThresholdChoice(None, 0.0, 0.0, 0)

    confidence = probs.max(axis=1)
    confident = confidence >= threshold
    count = int(confident.sum())
    correct = int((probs.argmax(axis=1)[confident] == labels[confident]).sum())
    return ThresholdChoice(
        threshold=float(threshold),
        precision=correct / count if count else 0.0,
        coverage=count / len(labels) if len(labels) else 0.0,
        confident_count=count,
    )


# One-sided 95% confidence (z for the 95th percentile of the normal distribution).
LOWER_BOUND_Z = 1.645


def wilson_lower_bound(correct: np.ndarray, total: np.ndarray, z: float = LOWER_BOUND_Z) -> np.ndarray:
    """Lower end of the Wilson score interval for a proportion: with ~95% confidence the true
    precision is at least this. 29 correct out of 30 gives ~0.86, not 0.97."""
    total = np.asarray(total, dtype=np.float64)
    p = np.asarray(correct, dtype=np.float64) / total
    z2 = z * z
    centre = p + z2 / (2 * total)
    margin = z * np.sqrt(p * (1 - p) / total + z2 / (4 * total * total))
    return (centre - margin) / (1 + z2 / total)


def choose_threshold(probs: np.ndarray, labels: np.ndarray, target_precision: float,
                     min_confident: int = MIN_CONFIDENT_SAMPLES) -> ThresholdChoice:
    """The lowest confidence threshold (so the most photos auto-released) at which we can be ~95%
    confident the true precision is at least ``target_precision`` — judged by the Wilson lower
    bound, not the raw precision on these photos. A threshold picked because a small sample happened
    to hit the target does not hold up: on the Cassava test photos, a class whose threshold rested
    on 30 validation photos at 97% raw precision was right only 82% of the time.

    Returns threshold None when no threshold qualifies."""
    confidence = probs.max(axis=1)
    is_correct = probs.argmax(axis=1) == labels

    order = np.argsort(-confidence, kind="stable")
    sorted_confidence = confidence[order]
    counts = np.arange(1, len(order) + 1)
    lower_bound_at_k = wilson_lower_bound(np.cumsum(is_correct[order]), counts)

    for k in range(len(order), min_confident - 1, -1):
        # Only cut between distinct confidence values: every photo tied with the k-th is included.
        if k < len(order) and sorted_confidence[k] == sorted_confidence[k - 1]:
            continue
        if lower_bound_at_k[k - 1] >= target_precision:
            return selective_metrics(probs, labels, float(sorted_confidence[k - 1]))

    return ThresholdChoice(None, 0.0, 0.0, 0)


def choose_class_thresholds(probs: np.ndarray, labels: np.ndarray, target_precision: float,
                            min_confident: int = MIN_CONFIDENT_SAMPLES) -> list[float | None]:
    """One threshold per class, applied to photos the model predicts as that class.

    A single global threshold lets a very common, easy class hide a weak one: on the Cassava
    validation photos one global threshold gave 95% precision overall while photos confidently
    predicted "healthy" were right only ~81% of the time. Each class must earn auto-release on
    its own evidence; a class without enough confident, accurate predictions gets None.
    """
    predictions = probs.argmax(axis=1)
    thresholds: list[float | None] = []
    for c in range(probs.shape[1]):
        predicted_c = predictions == c
        thresholds.append(
            choose_threshold(probs[predicted_c], labels[predicted_c], target_precision, min_confident).threshold
            if predicted_c.any() else None)
    return thresholds


def auto_release_metrics(probs: np.ndarray, labels: np.ndarray, thresholds: list[float | None]) -> dict:
    """What the per-class thresholds would auto-release: overall, and per predicted class."""
    predictions = probs.argmax(axis=1)
    confidence = probs.max(axis=1)
    class_thresholds = np.array([np.inf if t is None else t for t in thresholds])
    released = confidence >= class_thresholds[predictions]
    correct = released & (predictions == labels)

    per_class = []
    for c in range(probs.shape[1]):
        released_c = released & (predictions == c)
        count = int(released_c.sum())
        per_class.append({
            "threshold": thresholds[c],
            "released": count,
            "precision": float((correct & released_c).sum() / count) if count else 0.0,
        })

    count = int(released.sum())
    return {
        "precision": float(correct.sum() / count) if count else 0.0,
        "coverage": count / len(labels) if len(labels) else 0.0,
        "count": count,
        "perClass": per_class,
    }


def classification_metrics(probs: np.ndarray, labels: np.ndarray, class_count: int) -> dict:
    predictions = probs.argmax(axis=1)
    confusion = np.zeros((class_count, class_count), dtype=np.int64)
    np.add.at(confusion, (labels, predictions), 1)

    per_class = []
    for c in range(class_count):
        true_positive = confusion[c, c]
        predicted = confusion[:, c].sum()
        actual = confusion[c, :].sum()
        precision = true_positive / predicted if predicted else 0.0
        recall = true_positive / actual if actual else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class.append({"precision": float(precision), "recall": float(recall), "f1": float(f1), "support": int(actual)})

    return {
        "accuracy": float((predictions == labels).mean()) if len(labels) else 0.0,
        "macro_f1": float(np.mean([m["f1"] for m in per_class])),
        "per_class": per_class,
        "confusion_matrix": confusion.tolist(),
    }
