using AgriLink.API.Data;
using AgriLink.API.DTOs.Officer;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Officer's own dashboard. Everything here is scoped to the calling officer — their district,
/// their own review history — mirroring what AdminController.Metrics already gives Admin for
/// the whole platform, which Officer had no equivalent of at all.
/// </summary>
[ApiController]
[Route("api/officer")]
[Authorize(Roles = "Officer")]
public class OfficerController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public OfficerController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<OfficerMetricsResponse>> Metrics()
    {
        var userId = _currentUser.GetUserId(User);

        var profile = await _db.OfficerProfiles
            .AsNoTracking()
            .Include(o => o.Department)
            .FirstOrDefaultAsync(o => o.UserId == userId);

        if (profile is null)
        {
            return NotFound(new { message = "No officer profile found for this account." });
        }

        var pendingInDistrict = await _db.CropIssues
            .Where(i => i.Advisories.Any(a => a.Status == AdvisoryStatus.Draft))
            .Where(i => i.Crop.Field.Farm.District == profile.District)
            .CountAsync();

        var reviewedByMe = _db.AIAdvisories.Where(a => a.ReviewedByFK == userId);

        var todayUtc = DateTime.UtcNow.Date;
        var reviewedToday = await reviewedByMe.CountAsync(a => a.ReviewedAt >= todayUtc);
        var reviewedTotal = await reviewedByMe.CountAsync();
        var approvedTotal = await reviewedByMe.CountAsync(a => a.Status == AdvisoryStatus.Approved);
        var rejectedTotal = await reviewedByMe.CountAsync(a => a.Status == AdvisoryStatus.Rejected);

        return Ok(new OfficerMetricsResponse
        {
            District = profile.District,
            DepartmentName = profile.Department.Name,
            PendingInDistrict = pendingInDistrict,
            ReviewedToday = reviewedToday,
            ReviewedTotal = reviewedTotal,
            ApprovedTotal = approvedTotal,
            RejectedTotal = rejectedTotal,
        });
    }
}
