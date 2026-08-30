using System.Text.Json;
using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services.Agents;

public class AgentOrchestrator : IAgentOrchestrator
{
    private readonly AgriLinkDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IPlannerAgent _planner;
    private readonly ICropAnalysisAgent _cropAgent;
    private readonly IWeatherAgent _weatherAgent;
    private readonly IValidationAgent _validationAgent;
    private readonly ILogger<AgentOrchestrator> _logger;

    public AgentOrchestrator(
        AgriLinkDbContext db,
        INotificationService notifications,
        IPlannerAgent planner,
        ICropAnalysisAgent cropAgent,
        IWeatherAgent weatherAgent,
        IValidationAgent validationAgent,
        ILogger<AgentOrchestrator> logger)
    {
        _db = db;
        _notifications = notifications;
        _planner = planner;
        _cropAgent = cropAgent;
        _weatherAgent = weatherAgent;
        _validationAgent = validationAgent;
        _logger = logger;
    }

    public async Task<AIAdvisory> RunPipelineAsync(
        CropIssue issue,
        Crop crop,
        IReadOnlyList<CropActivity> recentActivities,
        CancellationToken cancellationToken)
    {
        var context = new AgentContext
        {
            CropId = crop.CropId,
            CropType = crop.CropType,
            Variety = crop.Variety,
            PlantingDate = crop.PlantingDate,
            ExpectedHarvestDate = crop.ExpectedHarvestDate,
            IssueTitle = Truncate(issue.Title, 200),
            IssueDescription = Truncate(issue.Description, 2000),
            Severity = issue.Severity,
            District = crop.Field.Farm.District,
            RecentActivities = recentActivities
                .Select(a => new AgentActivitySnapshot(a.ActivityType, a.ActivityDate, a.Description))
                .ToList(),
        };

        var advisory = new AIAdvisory { Status = AdvisoryStatus.Draft, RequiresApproval = true };
        var workflow = new AgentWorkflow
        {
            Advisory = advisory,
            Objective = $"Analyze crop issue: {context.IssueTitle}",
            Status = WorkflowStatus.Running,
            RequiresHumanApproval = true,
            StartedAt = DateTime.UtcNow,
        };
        advisory.Workflows.Add(workflow);

        try
        {
            var plan = await ExecuteStepAsync(
                workflow, "PlannerAgent",
                new { context.IssueTitle, Severity = context.Severity.ToString(), context.CropType },
                ct => _planner.CreatePlanAsync(context, ct), cancellationToken)
                ?? new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false, Reasoning = "Planner failed; defaulting to crop-only analysis." };

            CropFindings? cropFindings = null;
            if (plan.UseCropAgent)
            {
                cropFindings = await ExecuteStepAsync(
                    workflow, "CropAnalysisAgent",
                    new { context.CropType, context.IssueTitle, context.IssueDescription },
                    ct => _cropAgent.AnalyzeAsync(context, ct), cancellationToken);
            }

            WeatherFindings? weatherFindings = null;
            if (plan.UseWeatherAgent)
            {
                weatherFindings = await ExecuteStepAsync(
                    workflow, "WeatherAgent", new { context.District },
                    ct => _weatherAgent.GetWeatherFindingsAsync(context, ct), cancellationToken);
            }

            var validation = await ExecuteStepAsync(
                workflow, "ValidationAgent",
                new { HasCropFindings = cropFindings is not null, HasWeatherFindings = weatherFindings is not null },
                ct => _validationAgent.ValidateAsync(context, cropFindings, weatherFindings, ct), cancellationToken);

            if (validation is not null)
            {
                advisory.RiskLevel = validation.RiskLevel;
                advisory.Recommendation = validation.Recommendation;
                advisory.ConfidenceScore = validation.ConfidenceScore;
            }
            else
            {
                ApplySafeFallback(advisory, context);
            }

            advisory.RequiresApproval = true; // hard rule: officer sign-off is always required
            workflow.Status = WorkflowStatus.Completed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI advisory pipeline failed for issue '{Title}'", context.IssueTitle);
            ApplySafeFallback(advisory, context);
            workflow.Status = WorkflowStatus.Failed;
        }
        finally
        {
            workflow.CompletedAt = DateTime.UtcNow;
        }

        await NotifyOfficersAsync(context, cancellationToken);
        return advisory;
    }

    private static void ApplySafeFallback(AIAdvisory advisory, AgentContext context)
    {
        advisory.RiskLevel = context.Severity switch
        {
            IssueSeverity.High => RiskLevel.High,
            IssueSeverity.Medium => RiskLevel.Medium,
            _ => RiskLevel.Low,
        };
        advisory.Recommendation =
            "Automated analysis is temporarily unavailable for this report. An agricultural officer will " +
            "review it manually. This is not a diagnosis — please avoid applying any treatment until reviewed.";
        advisory.ConfidenceScore = 0.2f;
        advisory.RequiresApproval = true;
    }

    private async Task NotifyOfficersAsync(AgentContext context, CancellationToken cancellationToken)
    {
        var officerUserIds = await _db.OfficerProfiles
            .Where(o => o.District == context.District)
            .Select(o => o.UserId)
            .ToListAsync(cancellationToken);

        foreach (var userId in officerUserIds)
        {
            await _notifications.NotifyAsync(
                userId,
                "New crop issue advisory pending review",
                $"A new AI-drafted advisory for \"{context.IssueTitle}\" needs your review.");
        }
    }

    private async Task<T?> ExecuteStepAsync<T>(
        AgentWorkflow workflow, string agentName, object input,
        Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken)
    {
        var execution = new AgentExecution
        {
            Workflow = workflow,
            AgentName = agentName,
            InputData = JsonSerializer.Serialize(input),
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow,
        };
        workflow.Executions.Add(execution);
        workflow.CurrentStep = agentName;

        try
        {
            var result = await action(cancellationToken);
            execution.OutputData = JsonSerializer.Serialize(result);
            execution.Status = ExecutionStatus.Completed;
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "{AgentName} step failed", agentName);
            execution.OutputData = JsonSerializer.Serialize(new { error = ex.Message });
            execution.Status = ExecutionStatus.Failed;
            return default;
        }
        finally
        {
            execution.CompletedAt = DateTime.UtcNow;
        }
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
