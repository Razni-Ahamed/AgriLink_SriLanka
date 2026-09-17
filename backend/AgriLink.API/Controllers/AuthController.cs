using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private static readonly string[] SelfRegisterableRoles = { "Farmer", "Buyer" };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly IJwtTokenService _tokenService;
    private readonly INotificationService _notificationService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        IJwtTokenService tokenService,
        INotificationService notificationService)
    {
        _userManager = userManager;
        _db = db;
        _tokenService = tokenService;
        _notificationService = notificationService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
    {
        var role = SelfRegisterableRoles.FirstOrDefault(r => string.Equals(r, request.Role, StringComparison.OrdinalIgnoreCase));
        if (role is null)
        {
            return BadRequest(new { message = "Role must be 'Farmer' or 'Buyer'." });
        }

        var district = SriLankaDistricts.Canonicalize(request.District);
        if (district is null)
        {
            return BadRequest(new { message = "District must be one of Sri Lanka's 25 administrative districts." });
        }

        if (role == "Farmer")
        {
            if (string.IsNullOrWhiteSpace(request.FieldPlotNumber) || string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                return BadRequest(new { message = "Field/plot number and phone number are required for a Farmer application." });
            }
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.BusinessRegistrationNumber)
                || string.IsNullOrWhiteSpace(request.BusinessPhone)
                || string.IsNullOrWhiteSpace(request.LegalBusinessName))
            {
                return BadRequest(new { message = "Business registration number, business phone, and legal business name are required for a Buyer application." });
            }
        }

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            IsActive = false,
            RegistrationStatus = RegistrationStatus.Pending,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });
        }

        await _userManager.AddToRoleAsync(user, role);

        if (role == "Farmer")
        {
            _db.FarmerProfiles.Add(new FarmerProfile
            {
                UserId = user.Id,
                NIC = request.NIC,
                District = district,
                FieldPlotNumber = request.FieldPlotNumber,
                PhoneNumber = request.PhoneNumber,
            });
        }
        else
        {
            _db.BuyerProfiles.Add(new BuyerProfile
            {
                UserId = user.Id,
                BusinessName = request.LegalBusinessName!,
                District = district,
                NIC = request.NIC,
                BusinessRegistrationNumber = request.BusinessRegistrationNumber,
                BusinessPhone = request.BusinessPhone,
            });
        }

        await _db.SaveChangesAsync();

        if (role == "Farmer")
        {
            var officerUserIds = await _db.OfficerProfiles
                .Where(o => o.District == district)
                .Select(o => o.UserId)
                .ToListAsync();
            foreach (var officerUserId in officerUserIds)
            {
                await _notificationService.NotifyAsync(
                    officerUserId,
                    "New farmer application",
                    $"{user.FullName} has applied as a Farmer in {district} and is waiting for approval.");
            }
        }
        else
        {
            var admins = await _userManager.GetUsersInRoleAsync("Admin");
            foreach (var admin in admins)
            {
                await _notificationService.NotifyAsync(
                    admin.Id,
                    "New buyer application",
                    $"{user.FullName} has applied as a Buyer and is waiting for approval.");
            }
        }

        return StatusCode(StatusCodes.Status201Created, new RegisterResponse
        {
            Message = "Your application has been submitted and is waiting for approval.",
            Status = nameof(RegistrationStatus.Pending),
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.RegistrationStatus == RegistrationStatus.Pending)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is waiting for approval." });
        }

        if (user.RegistrationStatus == RegistrationStatus.Rejected)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your registration was not approved.", reason = user.RejectionReason });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.GenerateToken(user, roles);
        return Ok(new AuthResponse { Token = token, Role = roles.FirstOrDefault() ?? string.Empty });
    }

    /// <summary>
    /// Separate entry point for the admin console. Issues a token only for
    /// accounts that actually hold the Admin role, so a non-admin credential
    /// can never open the admin UI even if it is valid elsewhere.
    /// </summary>
    [HttpPost("admin/login")]
    public async Task<ActionResult<AuthResponse>> AdminLogin(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !user.IsActive || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (!roles.Contains(AdminSeeder.AdminRole))
        {
            // The caller proved ownership of this account, so naming the reason
            // leaks nothing they don't already know — and avoids a confusing
            // "wrong password" on a password that was in fact correct.
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "This account does not have administrator access." });
        }

        var token = _tokenService.GenerateToken(user, roles);
        return Ok(new AuthResponse { Token = token, Role = AdminSeeder.AdminRole });
    }
}
