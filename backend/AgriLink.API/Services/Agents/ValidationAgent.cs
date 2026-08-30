using AgriLink.API.Models;

namespace AgriLink.API.Services.Agents;

// STUB — the Validation Agent owner replaces this body. Keep the class name,
// namespace, and constructor signature unchanged so DI registration in Program.cs
// does not need to change.
public class ValidationAgent : IValidationAgent
{
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
        var riskLevel = context.Severity switch
        {
            IssueSeverity.High => RiskLevel.High,
            IssueSeverity.Medium => RiskLevel.Medium,
            _ => RiskLevel.Low,
        };

        var result = new ValidationResult
        {
            RiskLevel = riskLevel,
            Recommendation = $"Preliminary review of '{context.IssueTitle}': monitor the crop closely and " +
                              "consult an agricultural officer before taking action. This is a stub " +
                              "recommendation pending the Validation Agent implementation.",
            ConfidenceScore = 0.5f,
            RequiresApproval = true,
            Notes = "STUB implementation.",
        };
        return Task.FromResult(result);
    }
}
