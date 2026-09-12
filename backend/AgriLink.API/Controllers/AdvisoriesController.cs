using System.Text.Json;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Advisories;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
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

    public AdvisoriesController(
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        INotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _notifications = notifications;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdvisoryResponse>> GetById(int id)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue).ThenInclude(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(a => a.Issue).ThenInclude(i => i.FarmerProfile).ThenInclude(fp => fp.User)
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

            if (advisory.Status == AdvisoryStatus.Draft)
            {
                return NotFound();
            }
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
        Review(id, AdvisoryStatus.Approved, IssueStatus.Resolved, request);

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Officer,Admin")]
    public Task<ActionResult<AdvisoryResponse>> Reject(int id, ReviewAdvisoryRequest? request = null) =>
        Review(id, AdvisoryStatus.Rejected, IssueStatus.Rejected, request);

    private async Task<ActionResult<AdvisoryResponse>> Review(
        int id, AdvisoryStatus newStatus, IssueStatus issueStatus, ReviewAdvisoryRequest? request)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue).ThenInclude(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(a => a.Issue).ThenInclude(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Include(a => a.ReviewedByUser)
            .FirstOrDefaultAsync(a => a.AdvisoryId == id);

        if (advisory is null)
        {
            return NotFound();
        }

        if (advisory.Status != AdvisoryStatus.Draft)
        {
            return BadRequest(new { message = "Only draft advisories can be reviewed." });
        }

        var note = string.IsNullOrWhiteSpace(request?.Note) ? null : request.Note.Trim();

        advisory.Status = newStatus;
        advisory.ReviewedByFK = _currentUser.GetUserId(User);
        advisory.ReviewedAt = DateTime.UtcNow;
        advisory.ReviewNote = note;
        advisory.Issue.Status = issueStatus;

        _auditLog.Record(
            advisory.ReviewedByFK.Value,
            newStatus == AdvisoryStatus.Approved ? "AdvisoryApproved" : "AdvisoryRejected",
            "AIAdvisory",
            advisory.AdvisoryId,
            AdvisoryStatus.Draft.ToString(),
            newStatus.ToString());

        await _db.SaveChangesAsync();

        // The farmer previously had no way to learn their issue was decided short of
        // refreshing "My Issues" themselves — this is the same NotifyAsync path the AI
        // pipeline already uses to alert officers of a new issue, now closing the loop back.
        var farmerUserId = advisory.Issue.FarmerProfile?.UserId;
        if (farmerUserId is int recipientId)
        {
            var title = newStatus == AdvisoryStatus.Approved
                ? "Your crop issue advisory was approved"
                : "Your crop issue advisory was rejected";
            var message = $"\"{advisory.Issue.Title}\" has been reviewed.";
            if (note is not null)
            {
                message += $" Officer's note: {note}";
            }

            await _notifications.NotifyAsync(recipientId, title, message);
        }

        // ReviewedByUser was loaded before this advisory had a reviewer, so the id set just
        // above needs a fresh lookup rather than trusting the (still-null) navigation property.
        var reviewer = await _db.Users.FindAsync(advisory.ReviewedByFK);

        return Ok(ToResponse(advisory, reviewerOverride: reviewer));
    }

    private static AdvisoryResponse ToResponse(
        AIAdvisory advisory,
        ApplicationUser? reviewerOverride = null,
        bool includeReviewerContext = false,
        List<PreviousIssueSummary>? previousIssues = null) => new()
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
        CropType = advisory.Issue.Crop?.CropType ?? string.Empty,
        Variety = advisory.Issue.Crop?.Variety ?? string.Empty,
        District = advisory.Issue.Crop?.Field?.Farm?.District ?? string.Empty,
        ReporterName = advisory.Issue.FarmerProfile?.User?.FullName ?? string.Empty,
        PreviousIssues = previousIssues,
        AgentTrace = includeReviewerContext ? BuildAgentTrace(advisory) : null,
    };

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
