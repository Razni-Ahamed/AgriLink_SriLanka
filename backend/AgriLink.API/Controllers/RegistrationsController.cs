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
/// Officers never see Buyer rows here regardless of district.
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
        var results = new List<PendingRegistrationResponse>();

        if (_currentUser.IsAdmin(User))
        {
            var pendingFarmers = await _db.FarmerProfiles
                .Include(f => f.User)
                .Where(f => f.User.RegistrationStatus == RegistrationStatus.Pending)
                .ToListAsync();
            results.AddRange(pendingFarmers.Select(ToFarmerResponse));

            var pendingBuyers = await _db.BuyerProfiles
                .Include(b => b.User)
                .Where(b => b.User.RegistrationStatus == RegistrationStatus.Pending)
                .ToListAsync();
            results.AddRange(pendingBuyers.Select(ToBuyerResponse));
        }
        else
        {
            // Officers only ever see Farmer applications, scoped to their own district. Buyer
            // applications are never surfaced here for an Officer, in any district.
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            var pendingFarmers = await _db.FarmerProfiles
                .Include(f => f.User)
                .Where(f => f.User.RegistrationStatus == RegistrationStatus.Pending && f.District == district)
                .ToListAsync();
            results.AddRange(pendingFarmers.Select(ToFarmerResponse));
        }

        return Ok(results.OrderBy(r => r.CreatedAt).ToList());
    }

    [HttpPost("{userId:int}/approve")]
    public async Task<ActionResult<PendingRegistrationResponse>> Approve(int userId)
    {
        var context = await LoadDecisionContextAsync(userId);
        if (context.ErrorResult is not null)
        {
            return context.ErrorResult;
        }

        var (user, response) = (context.User!, context.Response!);

        user.RegistrationStatus = RegistrationStatus.Approved;
        user.IsActive = true;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });
        }

        _auditLog.Record(_currentUser.GetUserId(User), "RegistrationApproved", "User", userId, "Pending", "Approved");
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
        var context = await LoadDecisionContextAsync(userId);
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
    /// pending application, enforces the same scoping rules as Pending() (Officer limited to
    /// their own district's Farmer applications, Buyer applications Admin-only), and rejects
    /// anything already decided.
    /// </summary>
    private async Task<DecisionContext> LoadDecisionContextAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return new DecisionContext(null, null, NotFound());
        }

        if (user.RegistrationStatus != RegistrationStatus.Pending)
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
    };
}
