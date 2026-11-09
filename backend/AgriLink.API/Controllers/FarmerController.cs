using AgriLink.API.Data;
using AgriLink.API.DTOs.Farmer;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// The farmer's home-page summary, scoped to the calling farmer — the farmer's counterpart of
/// OfficerController.Metrics. Counts are exact, unlike counting one page of each list in the app.
/// </summary>
[ApiController]
[Route("api/farmer")]
[Authorize(Roles = "Farmer")]
public class FarmerController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public FarmerController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<FarmerOverviewResponse>> Overview(CancellationToken cancellationToken)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is not int farmerId)
        {
            return Forbid();
        }

        var openIssues = await _db.CropIssues.AsNoTracking()
            .CountAsync(i => i.FarmerProfileId == farmerId
                && (i.Status == IssueStatus.Pending || i.Status == IssueStatus.AwaitingReview), cancellationToken);
        var activeListings = await _db.HarvestListings.AsNoTracking()
            .CountAsync(h => h.FarmerProfileId == farmerId && h.Status == HarvestStatus.Active, cancellationToken);
        var pendingRequests = await _db.PurchaseRequests.AsNoTracking()
            .CountAsync(r => r.Harvest.FarmerProfileId == farmerId && r.Status == PurchaseRequestStatus.Pending, cancellationToken);
        var ordersInProgress = await _db.Orders.AsNoTracking()
            .CountAsync(o => o.FarmerProfileId == farmerId && o.Status == OrderStatus.Confirmed, cancellationToken);

        var latestAdvice = await _db.AIAdvisories.AsNoTracking()
            .Where(a => a.Issue.FarmerProfileId == farmerId && a.Status == AdvisoryStatus.Approved && a.ReviewedAt != null)
            .OrderByDescending(a => a.ReviewedAt)
            .Select(a => new LatestAdvice
            {
                AdvisoryId = a.AdvisoryId,
                IssueId = a.IssueId,
                IssueTitle = a.Issue.Title,
                CropType = a.Issue.Crop.CropType,
                ReviewedAt = a.ReviewedAt!.Value,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(new FarmerOverviewResponse
        {
            OpenIssues = openIssues,
            ActiveListings = activeListings,
            PendingRequests = pendingRequests,
            OrdersInProgress = ordersInProgress,
            LatestAdvice = latestAdvice,
        });
    }
}
