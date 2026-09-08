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

        return new CropFindings
        {
            PossibleCauses = causes,
            RecommendedActions = actions,
            Confidence = causes.Count == 1 ? SingleCauseConfidence : AmbiguousCauseConfidence,
            Notes = string.Empty,
        };
    }

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
