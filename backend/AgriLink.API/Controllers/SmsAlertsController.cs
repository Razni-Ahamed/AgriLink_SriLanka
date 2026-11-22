using AgriLink.API.Data;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Services;
using AgriLink.API.Services.Sms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Controllers;

/// <summary>The signed-in user's own SMS alert settings: on or off, and which language.</summary>
[ApiController]
[Route("api/users/me/sms-alerts")]
[Authorize]
public class SmsAlertsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly SmsOptions _options;

    public SmsAlertsController(AgriLinkDbContext db, ICurrentUserService currentUser, IOptions<SmsOptions> options)
    {
        _db = db;
        _currentUser = currentUser;
        _options = options.Value;
    }

    [HttpGet]
    public async Task<ActionResult<SmsAlertSettingsResponse>> Get()
    {
        var settings = await BuildAsync(_currentUser.GetUserId(User));
        return settings is null ? NotFound() : Ok(settings);
    }

    [HttpPut]
    public async Task<ActionResult<SmsAlertSettingsResponse>> Update(UpdateSmsAlertSettingsRequest request)
    {
        if (request.Language is not null && !SmsText.IsSupportedLanguage(request.Language))
        {
            return BadRequest(new { message = "Language must be en, si or ta." });
        }

        var userId = _currentUser.GetUserId(User);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return NotFound();
        }

        if (request.Enabled == true)
        {
            var recipient = await SmsRecipients.FindAsync(_db, userId, HttpContext.RequestAborted);
            if (recipient?.InternationalNumber is null)
            {
                return BadRequest(new { message = "Add a mobile number starting with 07 before turning on SMS alerts." });
            }
        }

        if (request.Enabled is bool enabled)
        {
            user.SmsAlertsEnabled = enabled;
        }

        if (request.Language is not null)
        {
            user.SmsLanguage = request.Language;
        }

        await _db.SaveChangesAsync();
        return Ok(await BuildAsync(userId));
    }

    private async Task<SmsAlertSettingsResponse?> BuildAsync(int userId)
    {
        var recipient = await SmsRecipients.FindAsync(_db, userId, HttpContext.RequestAborted);
        if (recipient is null)
        {
            return null;
        }

        return new SmsAlertSettingsResponse
        {
            Available = _options.IsEnabled,
            Enabled = recipient.Enabled,
            Language = recipient.Language,
            PhoneNumber = recipient.Phone,
            PhoneCanReceiveSms = recipient.InternationalNumber is not null,
        };
    }
}
