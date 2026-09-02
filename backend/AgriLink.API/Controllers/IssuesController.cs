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
            .Where(i => i.FarmerProfileId == farmerProfileId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(ToResponse));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Officer,Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> Pending()
    {
        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Where(i => i.Advisories.Any(a => a.Status == AdvisoryStatus.Draft))
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(ToResponse));
    }

    private static CropIssueResponse ToResponse(CropIssue issue) => new()
    {
        IssueId = issue.IssueId,
        CropId = issue.CropId,
        Title = issue.Title,
        Description = issue.Description,
        Severity = issue.Severity.ToString(),
        Status = issue.Status.ToString(),
        CreatedAt = issue.CreatedAt,
        AdvisoryId = issue.Advisories
            .OrderByDescending(a => a.AdvisoryId)
            .Select(a => (int?)a.AdvisoryId)
            .FirstOrDefault(),
    };
}
