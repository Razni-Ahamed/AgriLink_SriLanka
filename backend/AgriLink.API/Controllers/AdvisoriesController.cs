using AgriLink.API.Data;
using AgriLink.API.DTOs.Advisories;
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

    public AdvisoriesController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdvisoryResponse>> GetById(int id)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue)
            .FirstOrDefaultAsync(a => a.AdvisoryId == id);

        if (advisory is null)
        {
            return NotFound();
        }

        if (!User.IsInRole("Officer") && !User.IsInRole("Admin"))
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null || advisory.Issue.FarmerProfileId != farmerProfileId)
            {
                return Forbid();
            }
        }

        return Ok(ToResponse(advisory));
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Officer,Admin")]
    public Task<ActionResult<AdvisoryResponse>> Approve(int id) =>
        Review(id, AdvisoryStatus.Approved, IssueStatus.Resolved);

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Officer,Admin")]
    public Task<ActionResult<AdvisoryResponse>> Reject(int id) =>
        Review(id, AdvisoryStatus.Rejected, IssueStatus.Rejected);

    private async Task<ActionResult<AdvisoryResponse>> Review(int id, AdvisoryStatus newStatus, IssueStatus issueStatus)
    {
        var advisory = await _db.AIAdvisories
            .Include(a => a.Issue)
            .FirstOrDefaultAsync(a => a.AdvisoryId == id);

        if (advisory is null)
        {
            return NotFound();
        }

        if (advisory.Status != AdvisoryStatus.Draft)
        {
            return BadRequest(new { message = "Only draft advisories can be reviewed." });
        }

        advisory.Status = newStatus;
        advisory.ReviewedByFK = _currentUser.GetUserId(User);
        advisory.ReviewedAt = DateTime.UtcNow;
        advisory.Issue.Status = issueStatus;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(advisory));
    }

    private static AdvisoryResponse ToResponse(AIAdvisory advisory) => new()
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
        ReviewedAt = advisory.ReviewedAt,
    };
}
