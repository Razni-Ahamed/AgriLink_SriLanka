namespace AgriLink.API.Services.Agents;

// Rule-based crop diagnosis. Matches the farmer's reported symptoms against the static
// CropKnowledgeBase instead of calling an external LLM: deterministic, offline-testable,
// and it never feeds farmer-supplied text into anything executable. The async signature is
// kept so a real model can be swapped in later without touching the orchestrator.
public class CropAnalysisAgent : ICropAnalysisAgent
{
    private const float SingleCauseConfidence = 0.75f;
    private const float AmbiguousCauseConfidence = 0.55f;
    private const float FallbackConfidence = 0.2f;
    private const float FertilizerConflictPenalty = 0.2f;
    private const float MinimumConfidence = 0.1f;
    private const int FertilizerLookbackDays = 14;

    private static readonly string[] NutrientCauseKeywords = { "nitrogen", "nutrient deficiency" };
    private static readonly string[] FertilizerKeywords = { "fertiliz", "fertilis" };

    private readonly ILogger<CropAnalysisAgent> _logger;

    public CropAnalysisAgent(ILogger<CropAnalysisAgent> logger)
    {
        _logger = logger;
    }

    public Task<CropFindings> AnalyzeAsync(AgentContext context, CancellationToken cancellationToken)
    {
        try
        {
            return Task.FromResult(Analyze(context));
        }
        catch (Exception ex)
        {
            // The agent is a best-effort advisor: an unexpected failure must still produce a
            // usable, low-confidence finding rather than breaking the advisory pipeline.
            _logger.LogWarning(ex, "Crop analysis failed unexpectedly; returning the manual-inspection fallback.");
            return Task.FromResult(BuildFallback());
        }
    }

    private CropFindings Analyze(AgentContext context)
    {
        var combinedText = BuildCombinedText(context);
        var cropType = (context.CropType ?? string.Empty).Trim().ToLowerInvariant();

        _logger.LogDebug(
            "Analyzing crop issue for crop type '{CropType}' (symptom snippet: '{Snippet}')",
            cropType,
            Truncate(combinedText, 60));

        var matches = CropKnowledgeBase.Entries
            .Where(entry => entry.MatchesCrop(cropType) && entry.MatchesText(combinedText))
            .ToList();

        if (matches.Count == 0)
        {
            _logger.LogDebug("No knowledge base pattern matched for crop type '{CropType}'.", cropType);
            return BuildFallback();
        }

        var causes = Distinct(matches.Select(m => m.PossibleCause));
        var actions = Distinct(matches.Select(m => m.RecommendedAction));

        var confidence = causes.Count == 1 ? SingleCauseConfidence : AmbiguousCauseConfidence;
        var notes = new List<string>();

        if (causes.Count > 1)
        {
            notes.Add($"{causes.Count} different patterns matched this description, so the diagnosis is not conclusive.");
        }

        if (HasConflictingCauses(causes))
        {
            notes.Add("Some matched causes contradict each other (for example too much versus too little water) — field verification is needed before acting.");
        }

        if (matches.Any(m => m.WeatherRelated))
        {
            notes.Add("At least one likely cause is moisture or humidity driven, so recent rainfall is relevant context.");
        }

        // Consistency check called out in the design doc: a nutrient-deficiency diagnosis is
        // suspect if the farmer already fertilised recently. Surface the signal only — the
        // Validation agent makes the final call.
        if (ContainsAny(causes, NutrientCauseKeywords) && HasRecentFertilizerActivity(context.RecentActivities))
        {
            notes.Add("Note: fertilizer was applied recently — deficiency diagnosis may be inconsistent with this.");
            confidence -= FertilizerConflictPenalty;
        }

        return new CropFindings
        {
            PossibleCauses = causes,
            RecommendedActions = actions,
            Confidence = Math.Clamp(confidence, MinimumConfidence, 1f),
            Notes = notes.Count > 0 ? string.Join(" ", notes) : "Matched the knowledge base without any conflicting signals.",
        };
    }

    private static bool HasConflictingCauses(IReadOnlyList<string> causes)
    {
        foreach (var (left, right) in CropKnowledgeBase.ConflictingCausePhrases)
        {
            var hasLeft = causes.Any(c => c.Contains(left, StringComparison.OrdinalIgnoreCase));
            var hasRight = causes.Any(c => c.Contains(right, StringComparison.OrdinalIgnoreCase));
            if (hasLeft && hasRight)
            {
                return true;
            }
        }

        return false;
    }

    private static bool HasRecentFertilizerActivity(IReadOnlyList<AgentActivitySnapshot>? activities)
    {
        if (activities is null || activities.Count == 0)
        {
            return false;
        }

        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-FertilizerLookbackDays);

        return activities.Any(activity =>
            activity is not null &&
            activity.ActivityDate >= cutoff &&
            ContainsAny(new[] { activity.ActivityType ?? string.Empty, activity.Description ?? string.Empty }, FertilizerKeywords));
    }

    private static bool ContainsAny(IReadOnlyList<string> values, IReadOnlyList<string> keywords) =>
        values.Any(value =>
            !string.IsNullOrEmpty(value) &&
            keywords.Any(keyword => value.Contains(keyword, StringComparison.OrdinalIgnoreCase)));

    private static CropFindings BuildFallback() => new()
    {
        PossibleCauses = new[] { "No matching pattern in the knowledge base for this description." },
        RecommendedActions = new[] { "Recommend manual inspection by an agricultural officer." },
        Confidence = FallbackConfidence,
        Notes = "The reported symptoms did not match any known pattern, so no automated diagnosis was made.",
    };

    private static string BuildCombinedText(AgentContext context) =>
        $"{context.IssueTitle} {context.IssueDescription}".ToLowerInvariant();

    private static IReadOnlyList<string> Distinct(IEnumerable<string> values) =>
        values.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max] + "...";
}
