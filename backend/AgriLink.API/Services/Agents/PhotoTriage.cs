using AgriLink.API.Services.Agents.ImageClassification;

namespace AgriLink.API.Services.Agents;

/// <summary>Why a photo-diagnosed issue needs an officer. Stable codes: stored on the advisory and
/// translated for display by the frontend.</summary>
public static class EscalationReason
{
    public const string UnknownDisease = "UnknownDisease";
    public const string SeriousDisease = "SeriousDisease";
    public const string NoApprovedTreatment = "NoApprovedTreatment";
    public const string ModelNeverAutoReleases = "ModelNeverAutoReleases";
    public const string LowConfidence = "LowConfidence";
    public const string DescriptionMismatch = "DescriptionMismatch";
    public const string AutoReleaseDisabled = "AutoReleaseDisabled";
}

public record PhotoTriageResult
{
    /// <summary>True only when no escalation reason applies: the stored treatment may be sent to the
    /// farmer straight away, with the officer reviewing it afterwards.</summary>
    public bool AutoRelease { get; init; }

    /// <summary>Every reason that applies, not just the first, so the officer sees the full picture.</summary>
    public IReadOnlyList<string> EscalationReasons { get; init; } = Array.Empty<string>();

    public string DiseaseKey { get; init; } = string.Empty;
    public string DiseaseName { get; init; } = string.Empty;
    public double Confidence { get; init; }
    public double? AutoReleaseThreshold { get; init; }
}

/// <summary>
/// Decides whether a photo diagnosis can be answered by the agent or needs an officer. Pure and
/// deterministic: the rules agreed for photo reports, in one place.
/// </summary>
public static class PhotoTriage
{
    public static PhotoTriageResult Decide(
        ImageFindings findings,
        DiseaseKnowledgeEntry? disease,
        IReadOnlyList<DiseaseKnowledgeEntry> cropDiseases,
        string reportText,
        bool autoReleaseEnabled)
    {
        var top = findings.Top;
        var reasons = new List<string>();

        if (disease is null)
        {
            reasons.Add(EscalationReason.UnknownDisease);
        }
        else
        {
            if (disease.IsSerious)
            {
                reasons.Add(EscalationReason.SeriousDisease);
            }

            if (string.IsNullOrWhiteSpace(disease.Treatment))
            {
                reasons.Add(EscalationReason.NoApprovedTreatment);
            }

            if (DescriptionPointsElsewhere(disease, cropDiseases, reportText))
            {
                reasons.Add(EscalationReason.DescriptionMismatch);
            }
        }

        if (findings.AutoReleaseThreshold is not { } threshold)
        {
            reasons.Add(EscalationReason.ModelNeverAutoReleases);
        }
        else if (top.Probability < threshold)
        {
            reasons.Add(EscalationReason.LowConfidence);
        }

        if (!autoReleaseEnabled)
        {
            reasons.Add(EscalationReason.AutoReleaseDisabled);
        }

        return new PhotoTriageResult
        {
            AutoRelease = reasons.Count == 0,
            EscalationReasons = reasons,
            DiseaseKey = top.Key,
            DiseaseName = disease?.DisplayName ?? top.Name,
            Confidence = top.Probability,
            AutoReleaseThreshold = findings.AutoReleaseThreshold,
        };
    }

    // The farmer's words name a different disease of this crop and nothing about the predicted one —
    // e.g. the photo says mosaic but the description says "brown streak". Farmers rarely name
    // diseases, so most descriptions give no signal either way; only a clear contradiction counts.
    private static bool DescriptionPointsElsewhere(
        DiseaseKnowledgeEntry predicted, IReadOnlyList<DiseaseKnowledgeEntry> cropDiseases, string reportText)
    {
        var text = reportText.ToLowerInvariant();
        bool Mentions(DiseaseKnowledgeEntry entry) => entry.DescriptionKeywords.Any(text.Contains);

        return !Mentions(predicted) && cropDiseases.Any(other => other.Key != predicted.Key && Mentions(other));
    }
}
