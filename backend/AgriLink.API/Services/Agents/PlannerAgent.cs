using AgriLink.API.Models;

namespace AgriLink.API.Services.Agents;

public class PlannerAgent : IPlannerAgent
{
    private static readonly string[] WeatherKeywords =
    {
        "rain", "flood", "drought", "dry", "wind", "storm", "frost", "heat",
        "wilt", "mold", "mould", "fungus", "fungal", "humid", "water", "rot",
    };

    private readonly ILogger<PlannerAgent> _logger;

    public PlannerAgent(ILogger<PlannerAgent> logger)
    {
        _logger = logger;
    }

    public Task<PlannerPlan> CreatePlanAsync(AgentContext context, CancellationToken cancellationToken)
    {
        var text = $"{context.IssueTitle} {context.IssueDescription}";
        var keywordHit = WeatherKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
        var useWeather = keywordHit is not null || context.Severity != IssueSeverity.Low;

        var reasoning = useWeather
            ? $"Crop analysis always runs. Weather analysis triggered by " +
              $"{(keywordHit is not null ? $"keyword '{keywordHit}'" : $"severity={context.Severity}")}."
            : "Crop analysis always runs. Weather analysis skipped (low severity, no weather-related keywords).";

        var plan = new PlannerPlan { UseCropAgent = true, UseWeatherAgent = useWeather, Reasoning = reasoning };
        _logger.LogInformation("Planner decision for issue '{Title}': {Reasoning}", context.IssueTitle, reasoning);
        return Task.FromResult(plan);
    }
}
