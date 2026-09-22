using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Accounts;
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
        var fullName = request.FullName.Trim();
        if (fullName.Length < 2)
        {
            return BadRequest(new { message = "Enter your full name." });
        }

        var email = request.Email.Trim();

        var username = UsernamePolicy.Normalize(request.Username);
        var usernameCheck = UsernamePolicy.Check(username);
        if (usernameCheck != UsernameCheck.Valid)
        {
            return BadRequest(new { message = UsernamePolicy.MessageFor(usernameCheck) });
        }

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

        var nic = IdentityFieldNormalization.NormalizeNic(request.NIC);
        if (nic is null)
        {
            return BadRequest(new { message = "NIC must be 12 digits, or 9 digits followed by V or X." });
        }

        string? fieldPlotNumber = null;
        string? phoneNumber = null;
        string? businessRegistrationNumber = null;
        string? businessPhone = null;
        string? legalBusinessName = null;

        if (role == "Farmer")
        {
            fieldPlotNumber = request.FieldPlotNumber?.Trim();
            if (string.IsNullOrWhiteSpace(fieldPlotNumber))
            {
                return BadRequest(new { message = "Enter your field or plot number." });
            }

            phoneNumber = IdentityFieldNormalization.NormalizePhone(request.PhoneNumber);
            if (phoneNumber is null)
            {
                return BadRequest(new { message = "Phone number must be 10 digits." });
            }
        }
        else
        {
            businessRegistrationNumber = request.BusinessRegistrationNumber?.Trim();
            if (string.IsNullOrWhiteSpace(businessRegistrationNumber))
            {
                return BadRequest(new { message = "Enter your business registration number." });
            }

            legalBusinessName = request.LegalBusinessName?.Trim();
            if (string.IsNullOrWhiteSpace(legalBusinessName))
            {
                return BadRequest(new { message = "Enter your legal business name." });
            }

            businessPhone = IdentityFieldNormalization.NormalizePhone(request.BusinessPhone);
            if (businessPhone is null)
            {
                return BadRequest(new { message = "Business phone must be 10 digits." });
            }
        }

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        if (await _userManager.FindByNameAsync(username) is not null)
        {
            return Conflict(UsernameErrors.TakenBody);
        }

        // UsernameChangedAt stays null: the name chosen at sign-up doesn't start the 30-day clock.
        var user = new ApplicationUser
        {
            UserName = username,
            Email = email,
            FullName = fullName,
            IsActive = false,
            RegistrationStatus = RegistrationStatus.Pending,
        };

        var createResult = await UsernameErrors.CreateOrNullOnDuplicateAsync(_userManager, user, request.Password);
        if (createResult is null)
        {
            return Conflict(UsernameErrors.TakenBody);
        }

        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(e => new { code = e.Code, description = e.Description }) });
        }

        await _userManager.AddToRoleAsync(user, role);

        if (role == "Farmer")
        {
            _db.FarmerProfiles.Add(new FarmerProfile
            {
                UserId = user.Id,
                NIC = nic,
                District = district,
                FieldPlotNumber = fieldPlotNumber!,
                PhoneNumber = phoneNumber!,
            });
        }
        else
        {
            _db.BuyerProfiles.Add(new BuyerProfile
            {
                UserId = user.Id,
                BusinessName = legalBusinessName!,
                District = district,
                NIC = nic,
                BusinessRegistrationNumber = businessRegistrationNumber!,
                BusinessPhone = businessPhone!,
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
