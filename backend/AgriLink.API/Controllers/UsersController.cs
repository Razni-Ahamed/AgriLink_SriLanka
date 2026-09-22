using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Accounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly IJwtTokenService _tokenService;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        IJwtTokenService tokenService)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _tokenService = tokenService;
    }

    /// <summary>
    /// Live check for the username field. Anonymous so the registration form can use it; a signed-in
    /// caller's own current username counts as available, so the profile editor doesn't flag it.
    /// </summary>
    [HttpGet("username-available")]
    [AllowAnonymous]
    public async Task<ActionResult<UsernameAvailabilityResponse>> UsernameAvailable([FromQuery] string? username)
    {
        int? callerId = User.Identity?.IsAuthenticated == true ? _currentUser.GetUserId(User) : null;
        var reason = await UsernameAvailability.ReasonUnavailableAsync(
            _userManager, UsernamePolicy.Normalize(username), callerId, HttpContext.RequestAborted);

        return Ok(new UsernameAvailabilityResponse { Available = reason is null, Reason = reason });
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> Me()
    {
        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;

        var response = new UserProfileResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = role,
        };

        if (role == "Farmer")
        {
            var profile = await _db.FarmerProfiles.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == user.Id);
            response.NIC = profile?.NIC;
            response.District = profile?.District;
            response.FarmerProfileId = profile?.FarmerProfileId;
        }
        else if (role == "Officer")
        {
            var profile = await _db.OfficerProfiles.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == user.Id);
            response.District = profile?.District;
        }
        else if (role == "Buyer")
        {
            var profile = await _db.BuyerProfiles.AsNoTracking().FirstOrDefaultAsync(b => b.UserId == user.Id);
            response.District = profile?.District;
        }

        return Ok(response);
    }

    /// <summary>
    /// Self-service password change, open to every role (Admin included — AdminLoginPage signs
    /// into the same account type, just through a separate entry point). Returns a fresh token
    /// because ChangePasswordAsync rotates SecurityStamp, and the stamp check Program.cs runs on
    /// every request would otherwise reject the caller's own current token on their very next call.
    /// </summary>
    [HttpPost("me/password")]
    public async Task<ActionResult<AuthResponse>> ChangePassword(ChangePasswordRequest request)
    {
        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var changeResult = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!changeResult.Succeeded)
        {
            // Covers both a wrong current password and a new password that fails Identity's
            // policy — Identity's own error descriptions already say which.
            return BadRequest(new { errors = changeResult.Errors.Select(e => e.Description) });
        }

        _auditLog.Record(userId, "PasswordChanged", "User", userId);
        await _db.SaveChangesAsync();

        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.GenerateToken(user, roles);
        return Ok(new AuthResponse { Token = token, Role = roles.FirstOrDefault() ?? string.Empty });
    }
}
