using System.Text.Json;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Advisories;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/advisories")]
[Authorize]
public class AdvisoriesController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly INotificationService _notifications;
    private readonly IDiseaseKnowledgeBase _diseases;

    public AdvisoriesController(
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        INotificationService notifications,
        IDiseaseKnowledgeBase diseases)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _notifications = notifications;
        _diseases = diseases;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdvisoryResponse>> GetById(int id)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue).ThenInclude(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(a => a.Issue).ThenInclude(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Include(a => a.Issue).ThenInclude(i => i.Images)
            .Include(a => a.ReviewedByUser)
            .Include(a => a.Workflows).ThenInclude(w => w.Executions)
            .FirstOrDefaultAsync(a => a.AdvisoryId == id);

        if (advisory is null)
        {
            return NotFound();
        }

        var isReviewer = User.IsInRole("Officer") || User.IsInRole("Admin");

        if (!isReviewer)
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null || advisory.Issue.FarmerProfileId != farmerProfileId)
            {
                return Forbid();
            }

            // A Draft has not been released to the farmer. A Preliminary advisory has: it carries
            // advice from a confident photo diagnosis while the officer's confirmation is pending.
            if (advisory.Status == AdvisoryStatus.Draft)
            {
                return NotFound();
            }
        }
        else if (!await ReviewerMayAccessAsync(advisory, allowOwnPastReview: true))
        {
            return Forbid();
        }

        // The agent trace and this crop's other issues are diagnostic context for the person
        // deciding whether to trust the AI's recommendation — a farmer viewing their own,
        // already-decided advisory doesn't need either.
        List<PreviousIssueSummary>? previousIssues = null;
        if (isReviewer)
        {
            previousIssues = await _db.CropIssues
                .Where(i => i.CropId == advisory.Issue.CropId && i.IssueId != advisory.Issue.IssueId)
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new PreviousIssueSummary
                {
                    IssueId = i.IssueId,
                    Title = i.Title,
                    Severity = i.Severity.ToString(),
                    Status = i.Status.ToString(),
                    CreatedAt = i.CreatedAt,
                    AdvisoryId = i.Advisories
                        .OrderByDescending(a => a.AdvisoryId)
                        .Select(a => (int?)a.AdvisoryId)
                        .FirstOrDefault(),
                })
                .ToListAsync();
        }

        return Ok(ToResponse(advisory, includeReviewerContext: isReviewer, previousIssues: previousIssues));
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Officer,Admin")]
    public Task<ActionResult<AdvisoryResponse>> Approve(int id, ReviewAdvisoryRequest? request = null) =>
        Review(id, approve: true, request);

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Officer,Admin")]
    public Task<ActionResult<AdvisoryResponse>> Reject(int id, ReviewAdvisoryRequest? request = null) =>
        Review(id, approve: false, request);

    /// <summary>
    /// Approve or reject an advisory awaiting review (Draft, or Preliminary advice already shown to
    /// the farmer). For a photo diagnosis the officer decides the treatment:
    /// <list type="bullet">
    /// <item>Approve confirms the predicted disease. When the advice was held back (Draft) the farmer
    /// has had none yet, so a treatment is required.</item>
    /// <item>Reject corrects the diagnosis: the correct disease (one of the crop's classes or "other")
    /// and a treatment are both required.</item>
    /// </list>
    /// Advisories without a photo diagnosis behave as before; a treatment is optional for them.
    /// </summary>
    private async Task<ActionResult<AdvisoryResponse>> Review(int id, bool approve, ReviewAdvisoryRequest? request)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue).ThenInclude(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(a => a.Issue).ThenInclude(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Include(a => a.Issue).ThenInclude(i => i.Images)
            .Include(a => a.ReviewedByUser)
            .FirstOrDefaultAsync(a => a.AdvisoryId == id);

        if (advisory is null)
        {
            return NotFound();
        }

        if (!await ReviewerMayAccessAsync(advisory, allowOwnPastReview: false))
        {
            return Forbid();
        }

        var previousStatus = advisory.Status;
        if (previousStatus is not (AdvisoryStatus.Draft or AdvisoryStatus.Preliminary))
        {
            return BadRequest(new { message = "Only advisories awaiting review can be reviewed." });
        }

        var note = Trimmed(request?.Note);
        var treatment = Trimmed(request?.Treatment);
        var diseaseKey = Trimmed(request?.DiseaseKey);
        var isPhotoDiagnosis = advisory.PredictedDiseaseKey is not null;
        var wasPreliminary = previousStatus == AdvisoryStatus.Preliminary;

        if (isPhotoDiagnosis)
        {
            var error = ValidatePhotoReview(advisory, approve, wasPreliminary, diseaseKey, treatment);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }

            advisory.ConfirmedDiseaseKey = approve ? advisory.PredictedDiseaseKey : diseaseKey;
        }

        var newStatus = approve ? AdvisoryStatus.Approved : AdvisoryStatus.Rejected;
        advisory.Status = newStatus;
        advisory.ReviewedByFK = _currentUser.GetUserId(User);
        advisory.ReviewedAt = DateTime.UtcNow;
        advisory.ReviewNote = note;
        advisory.OfficerTreatment = treatment;
        // A rejection that comes with the officer's own treatment still resolves the farmer's issue.
        advisory.Issue.Status = approve || treatment is not null ? IssueStatus.Resolved : IssueStatus.Rejected;

        _auditLog.Record(
            advisory.ReviewedByFK.Value,
            approve ? "AdvisoryApproved" : "AdvisoryRejected",
            "AIAdvisory",
            advisory.AdvisoryId,
            previousStatus.ToString(),
            newStatus.ToString());

        await _db.SaveChangesAsync();

        // The farmer previously had no way to learn their issue was decided short of
        // refreshing "My Issues" themselves — this is the same NotifyAsync path the AI
        // pipeline already uses to alert officers of a new issue, now closing the loop back.
        var farmerUserId = advisory.Issue.FarmerProfile?.UserId;
        if (farmerUserId is int recipientId)
        {
            var (title, message) = FarmerNotification(advisory, approve, wasPreliminary, treatment);
            if (note is not null)
            {
                message += $" Officer's note: {note}";
            }

            await _notifications.NotifyAsync(recipientId, title, message);
        }

        // ReviewedByUser was loaded before this advisory had a reviewer, so the id set just
        // above needs a fresh lookup rather than trusting the (still-null) navigation property.
        var reviewer = await _db.Users.FindAsync(advisory.ReviewedByFK);

        return Ok(ToResponse(advisory, reviewerOverride: reviewer, includeReviewerContext: true));
    }

    /// <summary>
    /// Officers work their own district's queue (IssuesController.Pending), and the same boundary
    /// applies to opening or deciding a single advisory — otherwise any officer could approve any
    /// district's case by id. An officer may still reopen an advisory they reviewed themselves
    /// (their "reviewed" history). Admin is unscoped.
    /// </summary>
    private async Task<bool> ReviewerMayAccessAsync(AIAdvisory advisory, bool allowOwnPastReview)
    {
        if (_currentUser.IsAdmin(User))
        {
            return true;
        }

        if (allowOwnPastReview && advisory.ReviewedByFK == _currentUser.GetUserId(User))
        {
            return true;
        }

        var district = await _currentUser.GetOfficerDistrictAsync(User);
        return district is not null
            && string.Equals(advisory.Issue.Crop?.Field?.Farm?.District, district, StringComparison.Ordinal);
    }

    private string? ValidatePhotoReview(AIAdvisory advisory, bool approve, bool wasPreliminary, string? diseaseKey, string? treatment)
    {
        if (approve)
        {
            if (diseaseKey is not null && diseaseKey != advisory.PredictedDiseaseKey)
            {
                return "To change the diagnosis, reject it and choose the correct disease.";
            }

            return !wasPreliminary && treatment is null
                ? "The farmer has not received any advice for this photo yet — add the treatment to approve it."
                : null;
        }

        if (diseaseKey is null)
        {
            return "Choose the correct disease to reject this photo diagnosis.";
        }

        var crop = advisory.Issue.Crop.CropType;
        if (diseaseKey != DiseaseKnowledgeEntry.OtherKey && _diseases.Find(crop, diseaseKey) is null)
        {
            return $"'{diseaseKey}' is not a known disease for {crop}.";
        }

        return treatment is null ? "Add the treatment the farmer should follow instead." : null;
    }

    private (string Title, string Message) FarmerNotification(AIAdvisory advisory, bool approve, bool wasPreliminary, string? treatment)
    {
        var issueTitle = advisory.Issue.Title;

        if (wasPreliminary)
        {
            return approve && treatment is null
                ? ("Your crop advice was confirmed by an officer",
                   $"An agricultural officer confirmed the advice for \"{issueTitle}\".")
                : ("An officer updated the advice for your crop",
                   $"An agricultural officer reviewed \"{issueTitle}\" and changed the advice. " +
                   "Please follow the officer's advice instead of the earlier suggestion.");
        }

        return approve
            ? ("Your crop issue advisory was approved", $"\"{issueTitle}\" has been reviewed.")
            : treatment is not null
                ? ("Your crop issue has been reviewed", $"\"{issueTitle}\" has been reviewed and an officer has added advice.")
                : ("Your crop issue advisory was rejected", $"\"{issueTitle}\" has been reviewed.");
    }

    private static string? Trimmed(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private AdvisoryResponse ToResponse(
        AIAdvisory advisory,
        ApplicationUser? reviewerOverride = null,
        bool includeReviewerContext = false,
        List<PreviousIssueSummary>? previousIssues = null)
    {
        var crop = advisory.Issue.Crop?.CropType ?? string.Empty;

        return new AdvisoryResponse
        {
            AdvisoryId = advisory.AdvisoryId,
            IssueId = advisory.IssueId,
            IssueTitle = advisory.Issue.Title,
            Status = advisory.Status.ToString(),
            RiskLevel = advisory.RiskLevel.ToString(),
            Recommendation = advisory.Recommendation,
            ConfidenceScore = advisory.ConfidenceScore,
            RequiresApproval = advisory.RequiresApproval,
            ReviewedByFK = advisory.ReviewedByFK,
            ReviewedByName = (reviewerOverride ?? advisory.ReviewedByUser)?.FullName,
            ReviewedAt = advisory.ReviewedAt,
            ReviewNote = advisory.ReviewNote,
            IssueDescription = advisory.Issue.Description,
            IssueSeverity = advisory.Issue.Severity.ToString(),
            IssueStatus = advisory.Issue.Status.ToString(),
            IssueCreatedAt = advisory.Issue.CreatedAt,
            CropType = crop,
            Variety = advisory.Issue.Crop?.Variety ?? string.Empty,
            District = advisory.Issue.Crop?.Field?.Farm?.District ?? string.Empty,
            ReporterName = advisory.Issue.FarmerProfile?.User?.FullName ?? string.Empty,
            PreviousIssues = previousIssues,
            AgentTrace = includeReviewerContext ? BuildAgentTrace(advisory) : null,
            PhotoDiagnosis = BuildPhotoDiagnosis(advisory, crop, includeReviewerContext),
            ConfirmedDiseaseKey = advisory.ConfirmedDiseaseKey,
            ConfirmedDiseaseName = advisory.ConfirmedDiseaseKey is { } confirmed ? _diseases.DisplayName(crop, confirmed) : null,
            OfficerTreatment = advisory.OfficerTreatment,
            Photos = advisory.Issue.Images
                .OrderBy(i => i.ImageId)
                .Select(i => new IssuePhotoResponse
                {
                    ImageId = i.ImageId,
                    Url = $"/api/issues/{advisory.IssueId}/images/{i.ImageId}",
                    Width = i.Width,
                    Height = i.Height,
                })
                .ToList(),
        };
    }

    private PhotoDiagnosisResponse? BuildPhotoDiagnosis(AIAdvisory advisory, string crop, bool includeReviewerContext)
    {
        if (advisory.PredictedDiseaseKey is not { } key)
        {
            return null;
        }

        var response = new PhotoDiagnosisResponse
        {
            DiseaseKey = key,
            DiseaseName = _diseases.DisplayName(crop, key),
        };

        if (includeReviewerContext)
        {
            response.ModelConfidence = advisory.ModelConfidence;
            response.ModelVersion = advisory.ModelVersion;
            response.EscalationReasons = advisory.EscalationReasons?
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList() ?? new List<string>();
            response.SuggestedTreatment = _diseases.Find(crop, key)?.Treatment;
            response.DiseaseOptions = _diseases.ForCrop(crop)
                .Select(d => new DiseaseOptionResponse { Key = d.Key, Name = d.DisplayName })
                .Append(new DiseaseOptionResponse { Key = DiseaseKnowledgeEntry.OtherKey, Name = DiseaseKnowledgeEntry.OtherDisplayName })
                .ToList();
        }

        return response;
    }

    private static AgentTraceResponse? BuildAgentTrace(AIAdvisory advisory)
    {
        // A pipeline run produces exactly one AgentWorkflow per advisory (AgentOrchestrator
        // creates it up front and attaches it before the first step runs) — Workflows is a
        // collection only because the join table technically allows more than one.
        var workflow = advisory.Workflows.OrderByDescending(w => w.WorkflowId).FirstOrDefault();
        if (workflow is null)
        {
            return null;
        }

        return new AgentTraceResponse
        {
            Objective = workflow.Objective,
            Status = workflow.Status.ToString(),
            StartedAt = workflow.StartedAt,
            CompletedAt = workflow.CompletedAt,
            Steps = workflow.Executions
                .OrderBy(e => e.ExecutionId)
                .Select(e => new AgentStepResponse
                {
                    AgentName = e.AgentName,
                    Status = e.Status.ToString(),
                    StartedAt = e.StartedAt,
                    CompletedAt = e.CompletedAt,
                    Input = ParseJson(e.InputData),
                    Output = ParseJson(e.OutputData),
                })
                .ToList(),
        };
    }

    // AgentExecution.InputData/OutputData are JSON stored as text (AgentOrchestrator.
    // ExecuteStepAsync writes them with JsonSerializer.Serialize) — parsed here so the API
    // returns real JSON, not a JSON-encoded string the client would have to parse again.
    private static object? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<JsonElement>(json);
        }
        catch (JsonException)
        {
            return json;
        }
    }
}
