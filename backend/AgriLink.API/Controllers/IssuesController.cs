using AgriLink.API.Data;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAgentOrchestrator _orchestrator;

    public IssuesController(AgriLinkDbContext db, ICurrentUserService currentUser, IAgentOrchestrator orchestrator)
    {
        _db = db;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
    }

    [HttpPost]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<CropIssueResponse>> Create(CreateCropIssueRequest request)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var crop = await _db.Crops
            .Include(c => c.Field)
            .ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(c => c.CropId == request.CropId);

        if (crop is null)
        {
            return NotFound(new { message = "Crop not found." });
        }

        if (crop.Field.Farm.FarmerProfileId != farmerProfileId)
        {
            return Forbid();
        }

        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentActivities = await _db.CropActivities
            .Where(a => a.CropId == request.CropId && a.ActivityDate >= since)
            .ToListAsync();

        var issue = new CropIssue
        {
            CropId = request.CropId,
            FarmerProfileId = farmerProfileId.Value,
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Status = IssueStatus.AwaitingReview,
        };

        var advisory = await _orchestrator.RunPipelineAsync(issue, crop, recentActivities, HttpContext.RequestAborted);
        issue.Advisories.Add(advisory);

        issue.Crop = crop;
        _db.CropIssues.Add(issue);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToResponse(issue));
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<CropIssueResponse>>> Mine()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Where(i => i.FarmerProfileId == farmerProfileId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(i => ToResponse(i, includeReporter: false)));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Officer,Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> Pending()
    {
        var query = _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Where(i => i.Advisories.Any(a => a.Status == AdvisoryStatus.Draft));

        // Scoped to the calling officer's own district — the same district
        // AgentOrchestrator.NotifyOfficersAsync already used to decide who gets notified about
        // a new issue. Without this, every officer saw every district's queue, which disagreed
        // with what they'd actually been notified about. Admin keeps the unscoped, nationwide
        // view its own oversight role calls for.
        if (!_currentUser.IsAdmin(User))
        {
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            query = query.Where(i => i.Crop.Field.Farm.District == district);
        }

        var issues = await query.OrderBy(i => i.CreatedAt).ToListAsync();

        return Ok(issues.Select(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>
    /// Issues the calling officer has personally reviewed (approved or rejected), most recent
    /// first — their own decision history. Before this there was no way for an officer to see
    /// anything once it left the Draft-only Pending queue; Admin got a full oversight
    /// equivalent (GetAll) but nothing scoped to one officer's own past decisions existed.
    /// </summary>
    [HttpGet("reviewed")]
    [Authorize(Roles = "Officer")]
    public async Task<ActionResult<List<CropIssueResponse>>> Reviewed()
    {
        var userId = _currentUser.GetUserId(User);

        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Where(i => i.Advisories.Any(a => a.ReviewedByFK == userId))
            .ToListAsync();

        // OrderByDescending on the reviewed advisory's timestamp, not the issue's — sorting by
        // when it was reviewed (not when it was reported) is what makes this "recent activity"
        // rather than just Pending() with an extra filter.
        var ordered = issues
            .OrderByDescending(i => i.Advisories
                .Where(a => a.ReviewedByFK == userId)
                .Max(a => a.ReviewedAt));

        return Ok(ordered.Select(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>Every issue ever reported, any status — Admin's full oversight view, not just
    /// the Officer's Draft-advisory work queue.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> GetAll()
    {
        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(i => ToResponse(i, includeReporter: true)));
    }

    private static CropIssueResponse ToResponse(CropIssue issue, bool includeReporter = false)
    {
        var latestAdvisory = issue.Advisories.OrderByDescending(a => a.AdvisoryId).FirstOrDefault();

        return new CropIssueResponse
        {
            IssueId = issue.IssueId,
            CropId = issue.CropId,
            CropType = issue.Crop?.CropType ?? string.Empty,
            Variety = issue.Crop?.Variety ?? string.Empty,
            District = issue.Crop?.Field?.Farm?.District ?? string.Empty,
            ReporterName = includeReporter ? issue.FarmerProfile?.User?.FullName ?? string.Empty : string.Empty,
            Title = issue.Title,
            Description = issue.Description,
            Severity = issue.Severity.ToString(),
            Status = issue.Status.ToString(),
            CreatedAt = issue.CreatedAt,
            AdvisoryId = latestAdvisory?.AdvisoryId,
            ReviewedAt = latestAdvisory?.ReviewedAt,
            ReviewNote = latestAdvisory?.ReviewNote,
        };
    }
}
