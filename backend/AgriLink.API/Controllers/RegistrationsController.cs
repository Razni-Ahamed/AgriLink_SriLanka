using AgriLink.API.Data;
using AgriLink.API.DTOs.Registrations;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Review queue for pending Farmer/Buyer self-registrations. A Farmer application is approved
/// by an Officer of the applicant's own district, or by an Admin; a Buyer application is
/// Admin-only — an agricultural officer has no business judging a business registration, so
/// Officers never see Buyer rows here regardless of district. A rejected application can be
/// reviewed again and approved by the same people (a rejection made by mistake is otherwise
/// final: the applicant's email is taken, so they can't simply apply again).
/// </summary>
[ApiController]
[Route("api/registrations")]
[Authorize(Roles = "Officer,Admin")]
public class RegistrationsController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly INotificationService _notificationService;

    public RegistrationsController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        INotificationService notificationService)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _notificationService = notificationService;
    }

    [HttpGet("pending")]
    public async Task<ActionResult<List<PendingRegistrationResponse>>> Pending()
    {
        var results = await LoadApplicationsAsync(RegistrationStatus.Pending);
        return Ok(results.OrderBy(r => r.CreatedAt).ToList());
    }

    /// <summary>
    /// Rejected applications the caller could have decided, newest rejection first, with the
    /// reason given, so a mistaken rejection can be found and reversed with Approve.
    /// </summary>
    [HttpGet("rejected")]
    public async Task<ActionResult<List<PendingRegistrationResponse>>> Rejected()
    {
        var results = await LoadApplicationsAsync(RegistrationStatus.Rejected);

        // No rejection date is stored on the account, but every rejection is audit-logged.
        var ids = results.Select(r => r.UserId).ToList();
        var rejectedAt = await _db.AuditLogs
            .Where(a => a.Action == "RegistrationRejected" && a.EntityName == "User" && ids.Contains(a.EntityId))
            .GroupBy(a => a.EntityId)
            .Select(g => new { UserId = g.Key, At = g.Max(a => a.CreatedAt) })
            .ToDictionaryAsync(x => x.UserId, x => x.At);
        foreach (var result in results)
        {
            result.RejectedAt = rejectedAt.TryGetValue(result.UserId, out var at) ? at : null;
        }

        return Ok(results
            .OrderByDescending(r => r.RejectedAt ?? DateTime.MinValue)
            .ThenByDescending(r => r.CreatedAt)
            .ToList());
    }

    /// <summary>
    /// Farmer and Buyer applications in <paramref name="status"/> that the caller may decide: an
    /// Admin sees all; an Officer sees only Farmer applications from their own district, never
    /// Buyer ones.
    /// </summary>
    private async Task<List<PendingRegistrationResponse>> LoadApplicationsAsync(RegistrationStatus status)
    {
        var results = new List<PendingRegistrationResponse>();

        if (_currentUser.IsAdmin(User))
        {
            var farmers = await _db.FarmerProfiles
                .Include(f => f.User)
                .Where(f => f.User.RegistrationStatus == status)
                .ToListAsync();
            results.AddRange(farmers.Select(ToFarmerResponse));

            var buyers = await _db.BuyerProfiles
                .Include(b => b.User)
                .Where(b => b.User.RegistrationStatus == status)
                .ToListAsync();
            results.AddRange(buyers.Select(ToBuyerResponse));
        }
        else
        {
            // Officers only ever see Farmer applications, scoped to their own district. Buyer
            // applications are never surfaced here for an Officer, in any district.
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            var farmers = await _db.FarmerProfiles
                .Include(f => f.User)
                .Where(f => f.User.RegistrationStatus == status && f.District == district)
                .ToListAsync();
            results.AddRange(farmers.Select(ToFarmerResponse));
        }

        return results;
    }

    /// <summary>Approves a pending application, or reverses the rejection of a rejected one.</summary>
    [HttpPost("{userId:int}/approve")]
    public async Task<ActionResult<PendingRegistrationResponse>> Approve(int userId)
    {
        var context = await LoadDecisionContextAsync(userId, allowRejected: true);
        if (context.ErrorResult is not null)
        {
            return context.ErrorResult;
        }

        var (user, response) = (context.User!, context.Response!);
        var previousStatus = user.RegistrationStatus;

        user.RegistrationStatus = RegistrationStatus.Approved;
        user.IsActive = true;
        user.RejectionReason = null;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });
        }

        _auditLog.Record(_currentUser.GetUserId(User), "RegistrationApproved", "User", userId, previousStatus.ToString(), "Approved");
        await _db.SaveChangesAsync();

        await _notificationService.NotifyAsync(
            userId,
            "Application approved",
            "Your AgriLink application has been approved. You can now log in.");

        return Ok(response);
    }

    [HttpPost("{userId:int}/reject")]
    public async Task<ActionResult<PendingRegistrationResponse>> Reject(int userId, RejectRegistrationRequest request)
    {
        var context = await LoadDecisionContextAsync(userId, allowRejected: false);
        if (context.ErrorResult is not null)
        {
            return context.ErrorResult;
        }

        var (user, response) = (context.User!, context.Response!);

        user.RegistrationStatus = RegistrationStatus.Rejected;
        user.IsActive = false;
        user.RejectionReason = request.Reason;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });
        }

        _auditLog.Record(_currentUser.GetUserId(User), "RegistrationRejected", "User", userId, "Pending", request.Reason);
        await _db.SaveChangesAsync();

        await _notificationService.NotifyAsync(
            userId,
            "Application not approved",
            $"Your AgriLink application was not approved. Reason: {request.Reason}");

        return Ok(response);
    }

    private sealed record DecisionContext(ApplicationUser? User, PendingRegistrationResponse? Response, ActionResult? ErrorResult);

    /// <summary>
    /// Shared load + authorize + status check for Approve/Reject: locates the target user's
    /// application, enforces the same scoping rules as Pending() (Officer limited to their own
    /// district's Farmer applications, Buyer applications Admin-only), and refuses anything
    /// already decided, except that Approve (<paramref name="allowRejected"/>) may reverse a
    /// rejection.
    /// </summary>
    private async Task<DecisionContext> LoadDecisionContextAsync(int userId, bool allowRejected)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return new DecisionContext(null, null, NotFound());
        }

        var decidable = user.RegistrationStatus == RegistrationStatus.Pending
            || (allowRejected && user.RegistrationStatus == RegistrationStatus.Rejected);
        if (!decidable)
        {
            return new DecisionContext(null, null, BadRequest(new { message = "This application has already been decided." }));
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Buyer"))
        {
            if (!_currentUser.IsAdmin(User))
            {
                return new DecisionContext(null, null, Forbid());
            }

            var buyerProfile = await _db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == userId);
            if (buyerProfile is null)
            {
                return new DecisionContext(null, null, NotFound());
            }

            return new DecisionContext(user, ToBuyerResponse(buyerProfile, user), null);
        }

        if (roles.Contains("Farmer"))
        {
            var farmerProfile = await _db.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == userId);
            if (farmerProfile is null)
            {
                return new DecisionContext(null, null, NotFound());
            }

            if (!_currentUser.IsAdmin(User))
            {
                var district = await _currentUser.GetOfficerDistrictAsync(User);
                if (!string.Equals(farmerProfile.District, district, StringComparison.Ordinal))
                {
                    return new DecisionContext(null, null, Forbid());
                }
            }

            return new DecisionContext(user, ToFarmerResponse(farmerProfile, user), null);
        }

        return new DecisionContext(null, null, BadRequest(new { message = "This account has no pending Farmer or Buyer application." }));
    }

    private static PendingRegistrationResponse ToFarmerResponse(FarmerProfile profile) => ToFarmerResponse(profile, profile.User);

    private static PendingRegistrationResponse ToFarmerResponse(FarmerProfile profile, ApplicationUser user) => new()
    {
        UserId = user.Id,
        FullName = user.FullName,
        Email = user.Email ?? string.Empty,
        Role = "Farmer",
        District = profile.District,
        NIC = profile.NIC,
        CreatedAt = user.CreatedAt,
        FieldPlotNumber = profile.FieldPlotNumber,
        PhoneNumber = profile.PhoneNumber,
        RejectionReason = user.RejectionReason,
    };

    private static PendingRegistrationResponse ToBuyerResponse(BuyerProfile profile) => ToBuyerResponse(profile, profile.User);

    private static PendingRegistrationResponse ToBuyerResponse(BuyerProfile profile, ApplicationUser user) => new()
    {
        UserId = user.Id,
        FullName = user.FullName,
        Email = user.Email ?? string.Empty,
        Role = "Buyer",
        District = profile.District,
        NIC = profile.NIC,
        CreatedAt = user.CreatedAt,
        BusinessRegistrationNumber = profile.BusinessRegistrationNumber,
        BusinessPhone = profile.BusinessPhone,
        LegalBusinessName = profile.BusinessName,
        RejectionReason = user.RejectionReason,
    };
}
