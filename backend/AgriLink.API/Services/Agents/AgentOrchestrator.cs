using System.Text.Json;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services.Agents.ImageClassification;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents;

public class AgentOrchestrator : IAgentOrchestrator
{
    private readonly AgriLinkDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IPlannerAgent _planner;
    private readonly ICropAnalysisAgent _cropAgent;
    private readonly IWeatherAgent _weatherAgent;
    private readonly IValidationAgent _validationAgent;
    private readonly IImageClassifier _classifier;
    private readonly IDiseaseKnowledgeBase _diseases;
    private readonly ImageClassificationOptions _imageOptions;
    private readonly ILogger<AgentOrchestrator> _logger;

    public AgentOrchestrator(
        AgriLinkDbContext db,
        INotificationService notifications,
        IPlannerAgent planner,
        ICropAnalysisAgent cropAgent,
        IWeatherAgent weatherAgent,
        IValidationAgent validationAgent,
        IImageClassifier classifier,
        IDiseaseKnowledgeBase diseases,
        IOptions<ImageClassificationOptions> imageOptions,
        ILogger<AgentOrchestrator> logger)
    {
        _db = db;
        _notifications = notifications;
        _planner = planner;
        _cropAgent = cropAgent;
        _weatherAgent = weatherAgent;
        _validationAgent = validationAgent;
        _classifier = classifier;
        _diseases = diseases;
        _imageOptions = imageOptions.Value;
        _logger = logger;
    }

    public async Task<AIAdvisory> RunPipelineAsync(
        CropIssue issue,
        Crop crop,
        IReadOnlyList<CropActivity> recentActivities,
        byte[]? photo,
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
            // The photo model runs only for a photo of a crop it covers, and before the planner, so
            // the plan can use the diagnosis. Any failure (timeout, unreadable photo) leaves
            // ImageFindings null and the issue goes through the text-only agents as before.
            if (photo is not null && _classifier.SupportsCrop(context.CropType))
            {
                var findings = await ExecuteStepAsync(
                    workflow, "ImageClassificationAgent",
                    new { context.CropType, PhotoBytes = photo.Length },
                    ct => _classifier.ClassifyAsync(context.CropType, photo, ct), cancellationToken);
                context = context with { ImageFindings = findings };
            }

            var plan = await ExecuteStepAsync(
                workflow, "PlannerAgent",
                new { context.IssueTitle, Severity = context.Severity.ToString(), context.CropType, HasPhotoDiagnosis = context.ImageFindings is not null },
                ct => _planner.CreatePlanAsync(context, ct), cancellationToken)
                ?? new PlannerPlan
                {
                    UseCropAgent = context.ImageFindings is null,
                    UseWeatherAgent = false,
                    Reasoning = "Planner failed; defaulting to crop-only analysis.",
                };

            CropFindings? cropFindings = null;
            PhotoTriageResult? triage = null;
            if (context.ImageFindings is { } image)
            {
                var disease = _diseases.Find(context.CropType, image.Top.Key);
                triage = await ExecuteStepAsync(
                    workflow, "PhotoTriageAgent",
                    new { image.Top.Key, image.Top.Probability, image.AutoReleaseThreshold },
                    _ => Task.FromResult(PhotoTriage.Decide(
                        image, disease, _diseases.ForCrop(context.CropType),
                        $"{context.IssueTitle} {context.IssueDescription}", _imageOptions.AutoReleaseEnabled)),
                    cancellationToken);
                cropFindings = FindingsFromPhoto(image, disease, triage);
                RecordPhotoDiagnosis(advisory, image, triage);
                context = context with { AdviceReleasedBeforeReview = triage?.AutoRelease == true };
            }
            else if (plan.UseCropAgent)
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

            // Released to the farmer only when triage found no reason to hold it — and even then the
            // officer still reviews it afterwards.
            if (validation is not null && triage?.AutoRelease == true)
            {
                advisory.Status = AdvisoryStatus.Preliminary;
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

        var releasedToFarmer = advisory.Status == AdvisoryStatus.Preliminary;
        await NotifyOfficersAsync(context, releasedToFarmer, cancellationToken);
        if (releasedToFarmer)
        {
            await NotifyFarmerOfPreliminaryAdviceAsync(issue.FarmerProfileId, context, cancellationToken);
        }

        return advisory;
    }

    // The photo diagnosis in the shape ValidationAgent already reconciles with weather. Treatment is
    // only passed on when triage allowed releasing it; otherwise the officer decides the treatment.
    private static CropFindings FindingsFromPhoto(ImageFindings image, DiseaseKnowledgeEntry? disease, PhotoTriageResult? triage)
    {
        var name = disease?.DisplayName ?? image.Top.Name;
        var cause = disease?.IsHealthy == true
            ? $"No disease visible in the photo ({image.Top.Probability:P0} model confidence)"
            : $"{name} (identified from the photo with {image.Top.Probability:P0} model confidence)";

        var releasable = triage?.AutoRelease == true && !string.IsNullOrWhiteSpace(disease?.Treatment);

        return new CropFindings
        {
            PossibleCauses = new[] { cause },
            RecommendedActions = releasable ? new[] { disease!.Treatment! } : Array.Empty<string>(),
            Confidence = (float)image.Top.Probability,
            Notes = triage is null
                ? "Photo triage did not complete; an officer must review this diagnosis."
                : triage.AutoRelease
                    ? "Confident photo diagnosis of a known, minor disease with officer-approved advice."
                    : $"Needs officer review: {string.Join(", ", triage.EscalationReasons)}.",
        };
    }

    private static void RecordPhotoDiagnosis(AIAdvisory advisory, ImageFindings image, PhotoTriageResult? triage)
    {
        advisory.PredictedDiseaseKey = image.Top.Key;
        advisory.ModelConfidence = (float)image.Top.Probability;
        advisory.ModelVersion = image.ModelVersion;
        advisory.EscalationReasons = triage is null
            ? "TriageFailed"
            : triage.EscalationReasons.Count > 0 ? string.Join(",", triage.EscalationReasons) : null;
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

    private async Task NotifyOfficersAsync(AgentContext context, bool releasedToFarmer, CancellationToken cancellationToken)
    {
        var officerUserIds = await _db.OfficerProfiles
            .Where(o => o.District == context.District)
            .Select(o => o.UserId)
            .ToListAsync(cancellationToken);

        var (title, message) = releasedToFarmer
            ? ("Preliminary crop advice needs your confirmation",
               $"Advice for \"{context.IssueTitle}\" was sent to the farmer from a photo diagnosis. Please confirm or correct it.")
            : ("New crop issue advisory pending review",
               $"A new AI-drafted advisory for \"{context.IssueTitle}\" needs your review.");

        foreach (var userId in officerUserIds)
        {
            await _notifications.NotifyAsync(userId, title, message);
        }
    }

    private async Task NotifyFarmerOfPreliminaryAdviceAsync(int farmerProfileId, AgentContext context, CancellationToken cancellationToken)
    {
        var farmerUserId = await _db.FarmerProfiles
            .Where(f => f.FarmerProfileId == farmerProfileId)
            .Select(f => (int?)f.UserId)
            .FirstOrDefaultAsync(cancellationToken);

        if (farmerUserId is int userId)
        {
            await _notifications.NotifyAsync(
                userId,
                "Advice for your crop is ready",
                $"We identified the problem in your photo for \"{context.IssueTitle}\". An agricultural officer will also confirm the advice.");
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
