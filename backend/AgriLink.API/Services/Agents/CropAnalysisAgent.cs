namespace AgriLink.API.Services.Agents;

// STUB — the Crop Analysis Agent owner replaces this body. Keep the class name,
// namespace, and constructor signature unchanged so DI registration in Program.cs
// does not need to change.
public class CropAnalysisAgent : ICropAnalysisAgent
{
    private readonly ILogger<CropAnalysisAgent> _logger;

    public CropAnalysisAgent(ILogger<CropAnalysisAgent> logger)
    {
        _logger = logger;
    }

    public Task<CropFindings> AnalyzeAsync(AgentContext context, CancellationToken cancellationToken)
    {
        var findings = new CropFindings
        {
            PossibleCauses = new[] { "Cause analysis not yet implemented." },
            RecommendedActions = new[] { "Await officer review." },
            Confidence = 0.3f,
            Notes = "STUB implementation.",
        };
        return Task.FromResult(findings);
    }
}
