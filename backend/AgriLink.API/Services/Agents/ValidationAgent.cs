using System.Text;
using AgriLink.API.Models;

namespace AgriLink.API.Services.Agents;

// Deterministic reconciliation of Crop Analysis + Weather findings into the final
// AIAdvisory recommendation. Rule-based and side-effect-free by design: no external
// calls, no LLM, fully testable, and safe to run for every issue.
public class ValidationAgent : IValidationAgent
{
    private const string ClosingDisclaimer =
        "This is an AI-generated suggestion pending review by an agricultural officer — do not apply any treatment until it has been approved.";

    private static readonly string[] NutrientDeficiencyKeywords = { "nitrogen", "nutrient deficiency" };
    private static readonly string[] FertilizerKeywords = { "fertiliz", "fertilis" };
    private static readonly string[] FungalKeywords = { "fungal", "fungus", "mold", "mould", "rot", "blight", "mildew" };

    private readonly ILogger<ValidationAgent> _logger;

    public ValidationAgent(ILogger<ValidationAgent> logger)
    {
        _logger = logger;
    }

    public Task<ValidationResult> ValidateAsync(
        AgentContext context,
        CropFindings? cropFindings,
        WeatherFindings? weatherFindings,
        CancellationToken cancellationToken)
    {
        var riskLevel = BaselineRisk(context.Severity);

        if (cropFindings is null && weatherFindings is null)
        {
            var fallback = new ValidationResult
            {
                RiskLevel = riskLevel,
                Recommendation = ComposeFallbackRecommendation(),
                ConfidenceScore = 0.2f,
                RequiresApproval = true,
                Notes = "Both crop analysis and weather findings were unavailable; generic fallback advisory issued.",
            };
            return Task.FromResult(fallback);
        }

        var confidence = 0.7f;
        var notes = new List<string>();

        if (cropFindings is null)
        {
            confidence -= 0.3f;
            notes.Add("Crop-specific analysis was unavailable for this report.");
        }

        if (weatherFindings is null || weatherFindings.IsFallback)
        {
            confidence -= 0.15f;
            notes.Add("Weather context was unavailable.");
        }

        var possibleCauses = cropFindings?.PossibleCauses ?? Array.Empty<string>();

        var hasNutrientDeficiencyCause = ContainsAny(possibleCauses, NutrientDeficiencyKeywords);
        var hasRecentFertilizing = HasRecentFertilizingActivity(context.RecentActivities);
        if (hasNutrientDeficiencyCause && hasRecentFertilizing)
        {
            riskLevel = BumpRiskLevel(riskLevel);
            confidence -= 0.2f;
            notes.Add("This crop was recently fertilized, so a nutrient/nitrogen deficiency diagnosis is questionable and needs closer officer attention.");
        }

        var hasFungalCause = ContainsAny(possibleCauses, FungalKeywords);
        var heavyRecentRainfall = weatherFindings is not null && !weatherFindings.IsFallback && weatherFindings.RecentRainfallMm is > 50;
        if (heavyRecentRainfall && hasFungalCause)
        {
            confidence += 0.15f;
            var rainfallMm = weatherFindings!.RecentRainfallMm!.Value;
            notes.Add($"Recent heavy rainfall ({rainfallMm:0}mm) is consistent with fungal risk — findings agree.");
        }

        confidence = Math.Clamp(confidence, 0.05f, 0.95f);

        var recommendation = ComposeRecommendation(cropFindings, weatherFindings, notes);

        var result = new ValidationResult
        {
            RiskLevel = riskLevel,
            Recommendation = recommendation,
            ConfidenceScore = confidence,
            RequiresApproval = true,
            Notes = notes.Count > 0 ? string.Join(" ", notes) : string.Empty,
        };
        return Task.FromResult(result);
    }

    private static RiskLevel BaselineRisk(IssueSeverity severity) => severity switch
    {
        IssueSeverity.High => RiskLevel.High,
        IssueSeverity.Medium => RiskLevel.Medium,
        _ => RiskLevel.Low,
    };

    private static RiskLevel BumpRiskLevel(RiskLevel riskLevel) => riskLevel switch
    {
        RiskLevel.Low => RiskLevel.Medium,
        RiskLevel.Medium => RiskLevel.High,
        _ => RiskLevel.High,
    };

    private static bool ContainsAny(IReadOnlyList<string>? values, IReadOnlyList<string> keywords)
    {
        if (values is null || values.Count == 0)
        {
            return false;
        }

        foreach (var value in values)
        {
            if (string.IsNullOrEmpty(value))
            {
                continue;
            }

            foreach (var keyword in keywords)
            {
                if (value.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static bool HasRecentFertilizingActivity(IReadOnlyList<AgentActivitySnapshot>? activities)
    {
        if (activities is null || activities.Count == 0)
        {
            return false;
        }

        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-14);

        foreach (var activity in activities)
        {
            if (activity.ActivityDate < cutoff)
            {
                continue;
            }

            var matchesType = !string.IsNullOrEmpty(activity.ActivityType) && ContainsAny(new[] { activity.ActivityType }, FertilizerKeywords);
            var matchesDescription = !string.IsNullOrEmpty(activity.Description) && ContainsAny(new[] { activity.Description! }, FertilizerKeywords);

            if (matchesType || matchesDescription)
            {
                return true;
            }
        }

        return false;
    }

    private static string ComposeRecommendation(CropFindings? cropFindings, WeatherFindings? weatherFindings, IReadOnlyList<string> notes)
    {
        var sb = new StringBuilder();

        if (cropFindings is not null && cropFindings.PossibleCauses.Count > 0)
        {
            var causes = cropFindings.PossibleCauses.Take(2);
            sb.Append("Likely cause(s): ").Append(string.Join("; ", causes)).Append(". ");
        }
        else
        {
            sb.Append("Automated crop-specific analysis wasn't available for this report. ");
        }

        if (cropFindings is not null && cropFindings.RecommendedActions.Count > 0)
        {
            var actions = cropFindings.RecommendedActions.Take(2);
            sb.Append("Suggested next steps: ").Append(string.Join("; ", actions)).Append(". ");
        }

        if (weatherFindings is not null && !weatherFindings.IsFallback && !string.IsNullOrWhiteSpace(weatherFindings.Summary))
        {
            sb.Append("Weather context: ").Append(weatherFindings.Summary).Append(". ");
        }

        foreach (var note in notes)
        {
            sb.Append(note).Append(' ');
        }

        sb.Append(ClosingDisclaimer);

        return sb.ToString();
    }

    private static string ComposeFallbackRecommendation() =>
        "Automated crop and weather analysis were both unavailable for this report. " +
        "An agricultural officer will need to assess this issue manually. " +
        ClosingDisclaimer;
}
