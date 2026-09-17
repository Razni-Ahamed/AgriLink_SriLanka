import numpy as np
import pytest

from agrilink_ml.evaluation import (
    auto_release_metrics,
    choose_class_thresholds,
    choose_threshold,
    classification_metrics,
    fit_temperature,
    selective_metrics,
    softmax,
    wilson_lower_bound,
)


def probs_from(confidences, predicted, class_count=2):
    """Rows whose top class is `predicted` with the given confidence."""
    rows = np.full((len(confidences), class_count), 0.0)
    for i, (confidence, cls) in enumerate(zip(confidences, predicted)):
        rows[i, :] = (1 - confidence) / (class_count - 1)
        rows[i, cls] = confidence
    return rows


def test_threshold_is_the_lowest_confidence_that_still_meets_the_target():
    # 200 confident correct predictions, then 50 less confident ones that are all wrong.
    confidences = [0.99] * 200 + [0.6] * 50
    probs = probs_from(confidences, [0] * 250)
    labels = np.array([0] * 200 + [1] * 50)

    choice = choose_threshold(probs, labels, target_precision=0.95)

    assert choice.threshold == pytest.approx(0.99)
    assert choice.precision == 1.0
    assert choice.coverage == pytest.approx(200 / 250)


def test_threshold_admits_some_mistakes_when_there_is_enough_evidence():
    confidences = list(np.linspace(0.99, 0.70, 1000))
    labels = np.zeros(1000, dtype=int)
    labels[::50] = 1  # 2% wrong, spread across every confidence level
    probs = probs_from(confidences, [0] * 1000)

    choice = choose_threshold(probs, labels, target_precision=0.95)

    # 98% precision over 1000 photos: the lower bound (~97%) still clears 95%, so release them all.
    assert choice.coverage == 1.0
    assert choice.precision == pytest.approx(0.98)


def test_a_small_sample_that_merely_hits_the_target_is_not_trusted():
    probs = probs_from([0.99] * 30, [0] * 30)
    labels = np.array([0] * 29 + [1])  # 96.7% correct, but only 30 photos

    assert wilson_lower_bound(np.array([29]), np.array([30]))[0] == pytest.approx(0.864, abs=0.002)
    assert choose_threshold(probs, labels, target_precision=0.95).threshold is None


def test_ties_are_never_split_by_the_threshold():
    probs = probs_from([0.9] * 40, [0] * 40)
    labels = np.array([0] * 37 + [1] * 3)  # 92.5% correct, all at the same confidence

    choice = choose_threshold(probs, labels, target_precision=0.95, min_confident=30)

    assert choice.threshold is None


def test_no_auto_release_when_too_few_confident_photos_meet_the_target():
    probs = probs_from([0.99] * 10 + [0.5] * 90, [0] * 100)
    labels = np.array([0] * 10 + [1] * 90)

    choice = choose_threshold(probs, labels, target_precision=0.95, min_confident=30)

    assert choice.threshold is None
    assert choice.coverage == 0.0


def test_selective_metrics_with_no_threshold_releases_nothing():
    probs = probs_from([1.0, 1.0], [0, 0])

    assert selective_metrics(probs, np.array([0, 0]), None).confident_count == 0


def test_a_strong_common_class_cannot_hide_a_weak_one():
    # Class 0: 200 confident predictions, all correct. Class 1: 40 confident predictions, 25% wrong.
    # Pooled together that is 95.8% precision — a single global threshold would release both.
    probs = probs_from([0.99] * 200 + [0.99] * 40, [0] * 200 + [1] * 40)
    labels = np.array([0] * 200 + [1] * 30 + [0] * 10)

    thresholds = choose_class_thresholds(probs, labels, target_precision=0.95, min_confident=30)
    released = auto_release_metrics(probs, labels, thresholds)

    assert thresholds[0] == pytest.approx(0.99)
    assert thresholds[1] is None
    assert released["perClass"][1]["released"] == 0
    assert released["count"] == 200
    assert released["precision"] == 1.0


def test_a_class_the_model_never_predicts_gets_no_threshold():
    probs = probs_from([0.99] * 50, [0] * 50, class_count=3)
    labels = np.zeros(50, dtype=int)

    assert choose_class_thresholds(probs, labels, target_precision=0.95, min_confident=30)[1:] == [None, None]


def test_temperature_softens_an_overconfident_model():
    rng = np.random.default_rng(0)
    labels = rng.integers(0, 2, size=2000)
    # Logits that always favour the true class by a lot, but are right only 70% of the time.
    predicted = np.where(rng.random(2000) < 0.7, labels, 1 - labels)
    logits = np.zeros((2000, 2))
    logits[np.arange(2000), predicted] = 8.0

    temperature = fit_temperature(logits, labels)
    calibrated_confidence = softmax(logits, temperature).max(axis=1).mean()

    assert temperature > 1.0
    assert calibrated_confidence == pytest.approx(0.7, abs=0.03)


def test_softmax_rows_sum_to_one_and_survive_large_logits():
    probs = softmax(np.array([[1000.0, 0.0], [1.0, 2.0]]))

    assert np.allclose(probs.sum(axis=1), 1.0)
    assert np.isfinite(probs).all()


def test_classification_metrics_per_class_and_confusion_matrix():
    labels = np.array([0, 0, 1, 1])
    probs = probs_from([0.9, 0.9, 0.9, 0.9], [0, 1, 1, 1])

    metrics = classification_metrics(probs, labels, class_count=2)

    assert metrics["accuracy"] == 0.75
    assert metrics["confusion_matrix"] == [[1, 1], [0, 2]]
    assert metrics["per_class"][0] == {"precision": 1.0, "recall": 0.5, "f1": pytest.approx(2 / 3), "support": 2}
