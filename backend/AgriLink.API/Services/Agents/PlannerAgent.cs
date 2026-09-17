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
    private readonly IDiseaseKnowledgeBase _diseases;

    public PlannerAgent(ILogger<PlannerAgent> logger, IDiseaseKnowledgeBase diseases)
    {
        _logger = logger;
        _diseases = diseases;
    }

    public Task<PlannerPlan> CreatePlanAsync(AgentContext context, CancellationToken cancellationToken)
    {
        var plan = context.ImageFindings is null ? PlanFromText(context) : PlanFromPhoto(context);
        _logger.LogInformation("Planner decision for issue '{Title}': {Reasoning}", context.IssueTitle, plan.Reasoning);
        return Task.FromResult(plan);
    }

    private static PlannerPlan PlanFromText(AgentContext context)
    {
        var keywordHit = FindWeatherKeyword(context);
        var useWeather = keywordHit is not null || context.Severity != IssueSeverity.Low;

        var reasoning = useWeather
            ? $"Crop analysis always runs. Weather analysis triggered by " +
              $"{(keywordHit is not null ? $"keyword '{keywordHit}'" : $"severity={context.Severity}")}."
            : "Crop analysis always runs. Weather analysis skipped (low severity, no weather-related keywords).";

        return new PlannerPlan { UseCropAgent = true, UseWeatherAgent = useWeather, Reasoning = reasoning };
    }

    // With a photo diagnosis, keyword matching on the description would only compete with it, so
    // crop analysis is skipped; weather still matters when the diagnosed disease is moisture-driven.
    private PlannerPlan PlanFromPhoto(AgentContext context)
    {
        var top = context.ImageFindings!.Top;
        var disease = _diseases.Find(context.CropType, top.Key);
        var keywordHit = FindWeatherKeyword(context);

        string? weatherTrigger = disease?.WeatherRelated == true ? $"the photo diagnosis ({disease.DisplayName}) is weather-related"
            : keywordHit is not null ? $"keyword '{keywordHit}'"
            : context.Severity != IssueSeverity.Low ? $"severity={context.Severity}"
            : null;

        var reasoning = $"Photo classified as '{top.Key}' ({top.Probability:P0}), so keyword crop analysis is skipped. " +
            (weatherTrigger is not null ? $"Weather analysis triggered because {weatherTrigger}." : "Weather analysis skipped.");

        return new PlannerPlan { UseCropAgent = false, UseWeatherAgent = weatherTrigger is not null, Reasoning = reasoning };
    }

    private static string? FindWeatherKeyword(AgentContext context)
    {
        var text = $"{context.IssueTitle} {context.IssueDescription}";
        return WeatherKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
    }
}
