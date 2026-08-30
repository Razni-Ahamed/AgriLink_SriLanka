using AgriLink.API.Models;

namespace AgriLink.API.Services.Agents;

public interface IPlannerAgent
{
    Task<PlannerPlan> CreatePlanAsync(AgentContext context, CancellationToken cancellationToken);
}

public interface ICropAnalysisAgent
{
    Task<CropFindings> AnalyzeAsync(AgentContext context, CancellationToken cancellationToken);
}

public interface IWeatherAgent
{
    Task<WeatherFindings> GetWeatherFindingsAsync(AgentContext context, CancellationToken cancellationToken);
}

public interface IValidationAgent
{
    Task<ValidationResult> ValidateAsync(
        AgentContext context,
        CropFindings? cropFindings,
        WeatherFindings? weatherFindings,
        CancellationToken cancellationToken);
}

public interface IAgentOrchestrator
{
    Task<AIAdvisory> RunPipelineAsync(
        CropIssue issue,
        Crop crop,
        IReadOnlyList<CropActivity> recentActivities,
        CancellationToken cancellationToken);
}
