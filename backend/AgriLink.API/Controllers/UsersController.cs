using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Accounts;
using AgriLink.API.Services.Images;
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
    // The 5 MB photo plus multipart framing.
    private const long PhotoRequestLimitBytes = ProfilePhotoProcessor.MaxUploadBytes + 64 * 1024;

    // Keeps Sinhala and Tamil names readable in the audit log instead of \u-escaping every character.
    private static readonly JsonSerializerOptions AuditJsonOptions = new()
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly IJwtTokenService _tokenService;
    private readonly IProfilePhotoProcessor _photoProcessor;
    private readonly IProfilePhotoStorage _photoStorage;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        IJwtTokenService tokenService,
        IProfilePhotoProcessor photoProcessor,
        IProfilePhotoStorage photoStorage,
        ILogger<UsersController> logger)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _tokenService = tokenService;
        _photoProcessor = photoProcessor;
        _photoStorage = photoStorage;
        _logger = logger;
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
        var user = await _userManager.FindByIdAsync(_currentUser.GetUserId(User).ToString());
        if (user is null)
        {
            return NotFound();
        }

        return Ok(await BuildProfileAsync(user));
    }

    /// <summary>
    /// Updates the fields a user may change about themselves. A field left null (or out of the body)
    /// keeps its value; an empty display name clears it. Nothing here touches the security stamp, so
    /// the user's sessions stay signed in.
    /// </summary>
    [HttpPut("me/profile")]
    public async Task<ActionResult<UserProfileResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? string.Empty;
        if (request.FieldPlotNumber is not null && role != "Farmer")
        {
            return BadRequest(new { message = "Only farmer accounts have a field or plot number." });
        }

        if (request.BusinessName is not null && role != "Buyer")
        {
            return BadRequest(new { message = "Only buyer accounts have a business name." });
        }

        // Validate everything before changing anything, so a bad field never leaves a half-applied edit.
        string? newDisplayName = null;
        if (request.DisplayName is not null)
        {
            var trimmed = request.DisplayName.Trim();
            if (trimmed.Length > ProfileFieldLimits.DisplayName)
            {
                return BadRequest(new { message = $"Display name must be at most {ProfileFieldLimits.DisplayName} characters." });
            }

            if (trimmed.Any(char.IsControl))
            {
                return BadRequest(new { message = "Display name can't contain line breaks or control characters." });
            }

            newDisplayName = trimmed;
        }

        var now = DateTime.UtcNow;
        string? newUsername = null;
        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            var username = UsernamePolicy.Normalize(request.Username);
            if (username != user.UserName)
            {
                var check = UsernamePolicy.Check(username);
                if (check != UsernameCheck.Valid)
                {
                    return BadRequest(new { message = UsernamePolicy.MessageFor(check) });
                }

                var nextAllowed = UsernamePolicy.NextChangeAllowedAt(user.UsernameChangedAt, now);
                if (nextAllowed is not null)
                {
                    return BadRequest(new
                    {
                        message = $"You can change your username again on {nextAllowed:d MMMM yyyy}.",
                        nextChangeAllowedAt = nextAllowed,
                    });
                }

                var unavailable = await UsernameAvailability.ReasonUnavailableAsync(
                    _userManager, username, userId, HttpContext.RequestAborted);
                if (unavailable == UsernameAvailability.Taken)
                {
                    return Conflict(UsernameErrors.TakenBody);
                }

                newUsername = username;
            }
        }

        // An empty field/plot number or business name means "keep it" (only the display name can be
        // cleared): both are required details of the account.
        FarmerProfile? farmerProfile = null;
        var newFieldPlotNumber = request.FieldPlotNumber?.Trim();
        if (!string.IsNullOrEmpty(newFieldPlotNumber))
        {
            if (newFieldPlotNumber.Length > ProfileFieldLimits.FieldPlotNumber)
            {
                return BadRequest(new { message = $"Field/plot number must be at most {ProfileFieldLimits.FieldPlotNumber} characters." });
            }

            farmerProfile = await _db.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == userId);
            if (farmerProfile is null)
            {
                return BadRequest(new { message = "This account has no farmer profile to update." });
            }
        }

        BuyerProfile? buyerProfile = null;
        var newBusinessName = request.BusinessName?.Trim();
        if (!string.IsNullOrEmpty(newBusinessName))
        {
            if (newBusinessName.Length > ProfileFieldLimits.BusinessName)
            {
                return BadRequest(new { message = $"Business name must be at most {ProfileFieldLimits.BusinessName} characters." });
            }

            buyerProfile = await _db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == userId);
            if (buyerProfile is null)
            {
                return BadRequest(new { message = "This account has no buyer profile to update." });
            }
        }

        var oldValues = new Dictionary<string, string?>();
        var newValues = new Dictionary<string, string?>();
        void Track(string field, string? oldValue, string? newValue)
        {
            oldValues[field] = oldValue;
            newValues[field] = newValue;
        }

        if (newDisplayName is not null)
        {
            var displayName = newDisplayName.Length == 0 ? null : newDisplayName;
            if (displayName != user.DisplayName)
            {
                Track("displayName", user.DisplayName, displayName);
                user.DisplayName = displayName;
            }
        }

        if (newUsername is not null)
        {
            Track("username", user.UserName, newUsername);
            // Set directly rather than through UserManager.SetUserNameAsync, which would also rotate the
            // security stamp and sign the user out everywhere for what is only a rename.
            user.UserName = newUsername;
            user.NormalizedUserName = _userManager.NormalizeName(newUsername);
            user.UsernameChangedAt = now;
        }

        if (farmerProfile is not null && newFieldPlotNumber != farmerProfile.FieldPlotNumber)
        {
            Track("fieldPlotNumber", farmerProfile.FieldPlotNumber, newFieldPlotNumber);
            farmerProfile.FieldPlotNumber = newFieldPlotNumber;
        }

        if (buyerProfile is not null && newBusinessName != buyerProfile.BusinessName)
        {
            Track("businessName", buyerProfile.BusinessName, newBusinessName);
            buyerProfile.BusinessName = newBusinessName!;
        }

        if (newValues.Count > 0)
        {
            _auditLog.Record(userId, "ProfileUpdated", "User", userId,
                JsonSerializer.Serialize(oldValues, AuditJsonOptions),
                JsonSerializer.Serialize(newValues, AuditJsonOptions));

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (UsernameErrors.IsUniqueViolation(ex))
            {
                // Someone else took the username between the check above and this save.
                return Conflict(UsernameErrors.TakenBody);
            }
        }

        return Ok(await BuildProfileAsync(user));
    }

    /// <summary>
    /// Replaces the caller's profile photo. The new photo is stored and recorded before the old one is
    /// deleted, so a failure part-way through never leaves the account pointing at a missing image.
    /// </summary>
    [HttpPost("me/photo")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(PhotoRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = PhotoRequestLimitBytes)]
    public async Task<ActionResult<UserProfileResponse>> UploadPhoto([FromForm] UploadProfilePhotoRequest request)
    {
        var photo = request.Photo;
        if (photo is null || photo.Length == 0)
        {
            return BadRequest(new { message = "Choose a photo to upload." });
        }

        // Checked before reading, so an oversized upload is never buffered into memory.
        if (photo.Length > ProfilePhotoProcessor.MaxUploadBytes)
        {
            return BadRequest(new { message = "The photo is larger than 5 MB." });
        }

        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        ProcessedPhoto processed;
        try
        {
            processed = _photoProcessor.Process(await ReadAllBytesAsync(photo, HttpContext.RequestAborted));
        }
        catch (InvalidPhotoException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        StoredProfilePhoto stored;
        try
        {
            stored = await _photoStorage.SaveAsync(processed.Content, HttpContext.RequestAborted);
        }
        catch (ImageStorageException ex)
        {
            // A storage outage is not the user's fault; say so rather than blame their photo.
            _logger.LogError(ex, "Storing a profile photo failed");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Your photo could not be uploaded right now. Please try again in a few minutes.",
            });
        }

        var oldUrl = user.ProfilePhotoUrl;
        var oldKey = user.ProfilePhotoKey;
        user.ProfilePhotoUrl = stored.Url;
        user.ProfilePhotoKey = stored.Key;
        _auditLog.Record(userId, "ProfilePhotoChanged", "User", userId, oldUrl, stored.Url);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
            // Nothing references the new photo, so don't leave it behind in storage.
            await DeletePhotoQuietlyAsync(stored.Key);
            throw;
        }

        if (oldKey is not null)
        {
            await DeletePhotoQuietlyAsync(oldKey);
        }

        return Ok(await BuildProfileAsync(user));
    }

    /// <summary>Removes the caller's photo, so they are shown with their role's default picture again.</summary>
    [HttpDelete("me/photo")]
    public async Task<ActionResult<UserProfileResponse>> DeletePhoto()
    {
        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var oldKey = user.ProfilePhotoKey;
        if (oldKey is not null || user.ProfilePhotoUrl is not null)
        {
            _auditLog.Record(userId, "ProfilePhotoRemoved", "User", userId, user.ProfilePhotoUrl, null);
            user.ProfilePhotoUrl = null;
            user.ProfilePhotoKey = null;
            await _db.SaveChangesAsync();

            if (oldKey is not null)
            {
                await DeletePhotoQuietlyAsync(oldKey);
            }
        }

        return Ok(await BuildProfileAsync(user));
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

    private async Task<UserProfileResponse> BuildProfileAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;

        var response = new UserProfileResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = role,
            Username = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            UsernameChangeAvailableAt = UsernamePolicy.NextChangeAllowedAt(user.UsernameChangedAt, DateTime.UtcNow),
            CreatedAt = user.CreatedAt,
        };

        // Each role keeps its phone number in a different place: farmers and buyers gave theirs at
        // registration (on their profile row); officers and admins have only Identity's own column.
        if (role == "Farmer")
        {
            var profile = await _db.FarmerProfiles.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == user.Id);
            response.NIC = profile?.NIC;
            response.District = profile?.District;
            response.FarmerProfileId = profile?.FarmerProfileId;
            response.FieldPlotNumber = profile?.FieldPlotNumber;
            response.PhoneNumber = profile?.PhoneNumber;
        }
        else if (role == "Officer")
        {
            var profile = await _db.OfficerProfiles.AsNoTracking()
                .Include(o => o.Department)
                .FirstOrDefaultAsync(o => o.UserId == user.Id);
            response.District = profile?.District;
            response.DepartmentName = profile?.Department.Name;
            response.PhoneNumber = user.PhoneNumber;
        }
        else if (role == "Buyer")
        {
            var profile = await _db.BuyerProfiles.AsNoTracking().FirstOrDefaultAsync(b => b.UserId == user.Id);
            response.NIC = profile?.NIC;
            response.District = profile?.District;
            response.BusinessName = profile?.BusinessName;
            response.BusinessRegistrationNumber = profile?.BusinessRegistrationNumber;
            response.PhoneNumber = profile?.BusinessPhone;
        }
        else
        {
            response.PhoneNumber = user.PhoneNumber;
        }

        return response;
    }

    private static async Task<byte[]> ReadAllBytesAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var source = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        await source.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }

    /// <summary>
    /// Deleting the photo being replaced or removed is housekeeping: the account already points at the
    /// new state, so a failure is logged for follow-up rather than failing the user's request.
    /// </summary>
    private async Task DeletePhotoQuietlyAsync(string key)
    {
        try
        {
            // Not tied to the request: the user's change is already saved and should be tidied up
            // even if they navigate away.
            await _photoStorage.DeleteAsync(key, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Deleting a replaced profile photo from storage failed");
        }
    }
}
