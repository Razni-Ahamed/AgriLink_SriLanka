using System.Text.Json.Serialization;
using AgriLink.API.Models;
using AgriLink.API.Services.Agents.ImageClassification;

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

    /// <summary>What the photo model saw, when the farmer attached a photo of a crop that has a
    /// model and classification succeeded. Null means the text-only agents handle the issue.</summary>
    public ImageFindings? ImageFindings { get; init; }

    /// <summary>True when photo triage allowed this advice to reach the farmer before an officer
    /// reviews it, so the recommendation must not tell them to wait for approval.</summary>
    public bool AdviceReleasedBeforeReview { get; init; }
}

public record PlannerPlan
{
    public bool UseCropAgent { get; init; }
    public bool UseWeatherAgent { get; init; }
    public string Reasoning { get; init; } = string.Empty;

    /// <summary>"Rules", or the language model that made the plan (e.g. "LLM (qwen3.8-27b)").</summary>
    public string PlannedBy { get; init; } = PlannerAgent.RulesPlanner;

    /// <summary>The analysis steps in the order they run, each with why it was chosen. The
    /// Validation agent always runs afterwards and is not part of the plan.</summary>
    public IReadOnlyList<PlanStep> Steps { get; init; } = Array.Empty<PlanStep>();

    /// <summary>How many times the language model was asked (a failed or rejected answer is retried once).</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? LlmAttempts { get; init; }

    /// <summary>Which version of the planner prompt produced the plan.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PromptVersion { get; init; }

    /// <summary>Corrections the business rules made to the language model's plan.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<string>? GuardrailNotes { get; init; }

    /// <summary>Why the rules planned instead of the language model: unreachable, too slow, or its
    /// answer was rejected. Null when the rules are simply the configured planner.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? FallbackReason { get; init; }
}

/// <summary>One planned analysis step: which agent runs, and why. ("Reason" rather than "Why":
/// jsonb orders keys by length, and the trace should read Agent first.)</summary>
public record PlanStep(string Agent, string Reason);

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
