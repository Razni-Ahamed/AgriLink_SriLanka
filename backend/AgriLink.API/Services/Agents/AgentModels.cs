using AgriLink.API.Models;

namespace AgriLink.API.Services.Agents;

public record AgentActivitySnapshot(string ActivityType, DateOnly ActivityDate, string? Description);

public record AgentContext
{
    public int CropId { get; init; }
    public string CropType { get; init; } = string.Empty;
    public string Variety { get; init; } = string.Empty;
    public DateOnly PlantingDate { get; init; }
    public DateOnly ExpectedHarvestDate { get; init; }
    public string IssueTitle { get; init; } = string.Empty;
    public string IssueDescription { get; init; } = string.Empty;
    public IssueSeverity Severity { get; init; }
    public string District { get; init; } = string.Empty;
    public IReadOnlyList<AgentActivitySnapshot> RecentActivities { get; init; } = Array.Empty<AgentActivitySnapshot>();
}

public record PlannerPlan
{
    public bool UseCropAgent { get; init; }
    public bool UseWeatherAgent { get; init; }
    public string Reasoning { get; init; } = string.Empty;
}

public record CropFindings
{
    public IReadOnlyList<string> PossibleCauses { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> RecommendedActions { get; init; } = Array.Empty<string>();
    public float Confidence { get; init; }
    public string Notes { get; init; } = string.Empty;
}

public record WeatherFindings
{
    public string Summary { get; init; } = string.Empty;
    public double? RecentRainfallMm { get; init; }
    public double? AvgTemperatureC { get; init; }
    public bool IsFallback { get; init; }
    public string Notes { get; init; } = string.Empty;
}

public record ValidationResult
{
    public RiskLevel RiskLevel { get; init; }
    public string Recommendation { get; init; } = string.Empty;
    public float ConfidenceScore { get; init; }
    public bool RequiresApproval { get; init; } = true;
    public string Notes { get; init; } = string.Empty;
}
