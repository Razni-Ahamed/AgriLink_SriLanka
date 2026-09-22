using AgriLink.API.Common;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Accounts;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Accounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Review queue for identity-detail change requests (full name, NIC, email). An Officer decides
/// only Farmer requests in their own current district; Buyer and Officer requests, like Admin
/// account-creation, are Admin-only. Nobody — Officer or Admin — may decide their own request.
/// </summary>
[ApiController]
[Route("api/profile-change-requests")]
[Authorize(Roles = "Officer,Admin")]
public class ProfileChangeRequestsController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly INotificationService _notifications;

    public ProfileChangeRequestsController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        INotificationService notifications)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _notifications = notifications;
    }

    [HttpGet("pending")]
    public async Task<ActionResult<PagedResponse<PendingChangeRequestResponse>>> Pending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.ProfileChangeRequests
            .Include(r => r.User)
            .Where(r => r.Status == ChangeRequestStatus.Pending);

        if (!_currentUser.IsAdmin(User))
        {
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            var farmerUserIdsInDistrict = _db.FarmerProfiles
                .Where(f => f.District == district)
                .Select(f => f.UserId);
            query = query.Where(r => farmerUserIdsInDistrict.Contains(r.UserId));
        }

        var paged = await query.OrderBy(r => r.RequestedAt).ToPagedResponseAsync(page, pageSize, cancellationToken);

        var userIds = paged.Items.Select(r => r.UserId).Distinct().ToList();

        // One query for every requester's role instead of GetRolesAsync per row.
        var roleByUserId = await _db.UserRoles
            .Where(ur => userIds.Contains(ur.UserId))
            .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
            .ToDictionaryAsync(x => x.UserId, x => x.Name ?? string.Empty, cancellationToken);

        var farmerDistricts = await _db.FarmerProfiles.Where(f => userIds.Contains(f.UserId)).ToDictionaryAsync(f => f.UserId, f => f.District, cancellationToken);
        var buyerDistricts = await _db.BuyerProfiles.Where(b => userIds.Contains(b.UserId)).ToDictionaryAsync(b => b.UserId, b => b.District, cancellationToken);
        var officerDistricts = await _db.OfficerProfiles.Where(o => userIds.Contains(o.UserId)).ToDictionaryAsync(o => o.UserId, o => o.District, cancellationToken);

        var items = paged.Items.Select(r => new PendingChangeRequestResponse
        {
            RequestId = r.RequestId,
            UserId = r.UserId,
            FullName = r.User.FullName,
            Username = r.User.UserName ?? string.Empty,
            Role = roleByUserId.GetValueOrDefault(r.UserId, string.Empty),
            ProfilePhotoUrl = r.User.ProfilePhotoUrl,
            District = farmerDistricts.GetValueOrDefault(r.UserId)
                ?? buyerDistricts.GetValueOrDefault(r.UserId)
                ?? officerDistricts.GetValueOrDefault(r.UserId),
            Field = r.Field.ToString(),
            OldValue = r.OldValue,
            NewValue = r.NewValue,
            RequestedAt = r.RequestedAt,
        }).ToList();

        return Ok(new PagedResponse<PendingChangeRequestResponse>
        {
            Items = items,
            Page = paged.Page,
            PageSize = paged.PageSize,
            TotalCount = paged.TotalCount,
            TotalPages = paged.TotalPages,
        });
    }

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, VerifyPasswordRequest request)
    {
        var actingUserId = _currentUser.GetUserId(User);
        var actingUser = await _userManager.FindByIdAsync(actingUserId.ToString());
        if (actingUser is null)
        {
            return NotFound();
        }

        if (!await SecurityReauth.VerifyAsync(_userManager, actingUser, request.CurrentPassword))
        {
            _auditLog.Record(actingUserId, "SecurityReauthFailed", "User", actingUserId);
            await _db.SaveChangesAsync();
            return BadRequest(new { message = "Current password is incorrect." });
        }

        var context = await LoadAuthorizedPendingRequestAsync(id, actingUserId);
        if (context.ErrorResult is not null)
        {
            return context.ErrorResult;
        }

        var changeRequest = context.Request!;
        var targetUser = changeRequest.User;

        if (changeRequest.Field == ChangeRequestField.Email)
        {
            if (!IdentityFieldNormalization.IsValidEmail(changeRequest.NewValue))
            {
                return BadRequest(new { message = "This request's new email is no longer a valid format." });
            }

            var existingByEmail = await _userManager.FindByEmailAsync(changeRequest.NewValue);
            if (existingByEmail is not null && existingByEmail.Id != changeRequest.UserId)
            {
                return Conflict(new { message = "That email has since been taken by another account." });
            }

            // Identity's own calls save themselves; run them before touching the request row so a
            // failure here leaves the request Pending instead of half-applied.
            var setEmailResult = await _userManager.SetEmailAsync(targetUser, changeRequest.NewValue);
            if (!setEmailResult.Succeeded)
            {
                return BadRequest(new { errors = setEmailResult.Errors.Select(e => new { code = e.Code, description = e.Description }) });
            }

            await _userManager.UpdateSecurityStampAsync(targetUser);
        }
        else if (changeRequest.Field == ChangeRequestField.FullName)
        {
            targetUser.FullName = changeRequest.NewValue;
        }
        else
        {
            if (IdentityFieldNormalization.NormalizeNic(changeRequest.NewValue) is null)
            {
                return BadRequest(new { message = "This request's NIC is no longer a valid format." });
            }

            var role = (await _userManager.GetRolesAsync(targetUser)).FirstOrDefault();
            if (role == "Farmer")
            {
                var profile = await _db.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == targetUser.Id);
                if (profile is null)
                {
                    return NotFound();
                }

                profile.NIC = changeRequest.NewValue;
            }
            else if (role == "Buyer")
            {
                var profile = await _db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == targetUser.Id);
                if (profile is null)
                {
                    return NotFound();
                }

                profile.NIC = changeRequest.NewValue;
            }
            else
            {
                return BadRequest(new { message = "This account has no NIC." });
            }
        }

        changeRequest.Status = ChangeRequestStatus.Approved;
        changeRequest.DecidedByUserId = actingUserId;
        changeRequest.DecidedAt = DateTime.UtcNow;

        _auditLog.Record(
            actingUserId, "ProfileChangeApproved", "ProfileChangeRequest", changeRequest.RequestId,
            changeRequest.OldValue, changeRequest.NewValue);
        await _db.SaveChangesAsync();

        await _notifications.NotifyAsync(
            changeRequest.UserId,
            "Profile change approved",
            $"Your {FieldLabel(changeRequest.Field)} change was approved.");

        return Ok(ToSummary(changeRequest));
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectChangeRequestRequest request)
    {
        var actingUserId = _currentUser.GetUserId(User);

        var context = await LoadAuthorizedPendingRequestAsync(id, actingUserId);
        if (context.ErrorResult is not null)
        {
            return context.ErrorResult;
        }

        var changeRequest = context.Request!;
        changeRequest.Status = ChangeRequestStatus.Rejected;
        changeRequest.DecidedByUserId = actingUserId;
        changeRequest.DecidedAt = DateTime.UtcNow;
        changeRequest.RejectionReason = request.Reason;

        _auditLog.Record(
            actingUserId, "ProfileChangeRejected", "ProfileChangeRequest", changeRequest.RequestId,
            changeRequest.OldValue, request.Reason);
        await _db.SaveChangesAsync();

        await _notifications.NotifyAsync(
            changeRequest.UserId,
            "Profile change not approved",
            $"Your {FieldLabel(changeRequest.Field)} change request was not approved. Reason: {request.Reason}");

        return Ok(ToSummary(changeRequest));
    }

    private sealed record RequestDecisionContext(ProfileChangeRequest? Request, ActionResult? ErrorResult);

    /// <summary>
    /// Loads the request and enforces every rule an approver must pass on this specific request —
    /// not just what the pending list already filtered by — so a stale link or a crafted id can
    /// never bypass district scoping, the Buyer/Officer Admin-only rule, or the self-approval ban.
    /// </summary>
    private async Task<RequestDecisionContext> LoadAuthorizedPendingRequestAsync(int id, int actingUserId)
    {
        var changeRequest = await _db.ProfileChangeRequests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.RequestId == id);
        if (changeRequest is null)
        {
            return new RequestDecisionContext(null, NotFound());
        }

        if (changeRequest.UserId == actingUserId)
        {
            return new RequestDecisionContext(null, Forbid());
        }

        if (!_currentUser.IsAdmin(User))
        {
            var requesterRole = (await _userManager.GetRolesAsync(changeRequest.User)).FirstOrDefault();
            if (requesterRole != "Farmer")
            {
                return new RequestDecisionContext(null, Forbid());
            }

            var officerDistrict = await _currentUser.GetOfficerDistrictAsync(User);
            var farmerProfile = await _db.FarmerProfiles.AsNoTracking()
                .FirstOrDefaultAsync(f => f.UserId == changeRequest.UserId);
            if (farmerProfile is null || !string.Equals(farmerProfile.District, officerDistrict, StringComparison.Ordinal))
            {
                return new RequestDecisionContext(null, Forbid());
            }
        }

        if (changeRequest.Status != ChangeRequestStatus.Pending)
        {
            return new RequestDecisionContext(null, BadRequest(new { message = "This request has already been decided." }));
        }

        return new RequestDecisionContext(changeRequest, null);
    }

    private static string FieldLabel(ChangeRequestField field) => field switch
    {
        ChangeRequestField.FullName => "full name",
        ChangeRequestField.NIC => "NIC",
        ChangeRequestField.Email => "email",
        _ => field.ToString(),
    };

    private static ChangeRequestSummary ToSummary(ProfileChangeRequest request) => new()
    {
        RequestId = request.RequestId,
        Field = request.Field.ToString(),
        OldValue = request.OldValue,
        NewValue = request.NewValue,
        Status = request.Status.ToString(),
        RequestedAt = request.RequestedAt,
        DecidedAt = request.DecidedAt,
        RejectionReason = request.RejectionReason,
    };
}
