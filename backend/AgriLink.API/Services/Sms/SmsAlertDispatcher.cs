using AgriLink.API.Data;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services.Sms;

/// <summary>
/// Sends queued alerts one at a time, in the background. For each one it checks, at send time,
/// that the user still wants SMS and has a mobile number, and writes the text in their language.
/// A failed send is logged and skipped: the in-app notification is already there.
/// </summary>
public sealed class SmsAlertDispatcher : BackgroundService
{
    private readonly SmsAlertQueue _queue;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<SmsAlertDispatcher> _logger;

    public SmsAlertDispatcher(SmsAlertQueue queue, IServiceScopeFactory scopes, ILogger<SmsAlertDispatcher> logger)
    {
        _queue = queue;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_queue.IsEnabled)
        {
            _logger.LogInformation("SMS alerts: off (no Sms:Provider configured).");
            return;
        }

        _logger.LogInformation("SMS alerts: on.");
        try
        {
            await foreach (var item in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                await SendOneAsync(item, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down; anything still queued is dropped, like an unsent text.
        }
    }

    public async Task SendOneAsync(QueuedSmsAlert item, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AgriLinkDbContext>();
            var recipient = await SmsRecipients.FindAsync(db, item.UserId, cancellationToken);
            if (recipient is not { Enabled: true, InternationalNumber: not null })
            {
                return;
            }

            var text = SmsTemplates.Render(item.Alert, recipient.Language);
            var sender = scope.ServiceProvider.GetRequiredService<ISmsSender>();
            var sent = await sender.SendAsync(recipient.InternationalNumber, text, cancellationToken);
            if (!sent)
            {
                _logger.LogWarning("SMS {Kind} alert for user {UserId} was not accepted by the gateway", item.Alert.Kind, item.UserId);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMS {Kind} alert for user {UserId} failed", item.Alert.Kind, item.UserId);
        }
    }
}

public sealed record SmsRecipient(bool Enabled, string Language, string? Phone, string? InternationalNumber);

public static class SmsRecipients
{
    /// <summary>
    /// The user's SMS settings and the phone number alerts go to: a farmer's profile phone, a
    /// buyer's business phone, otherwise the account's own phone (officers and admins).
    /// </summary>
    public static async Task<SmsRecipient?> FindAsync(AgriLinkDbContext db, int userId, CancellationToken cancellationToken = default)
    {
        var row = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId && u.IsActive)
            .Select(u => new
            {
                u.SmsAlertsEnabled,
                u.SmsLanguage,
                FarmerPhone = u.FarmerProfile != null ? u.FarmerProfile.PhoneNumber : null,
                BuyerPhone = u.BuyerProfile != null ? u.BuyerProfile.BusinessPhone : null,
                u.PhoneNumber,
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            return null;
        }

        var phone = row.FarmerPhone ?? row.BuyerPhone ?? row.PhoneNumber;
        var language = SmsText.IsSupportedLanguage(row.SmsLanguage) ? row.SmsLanguage : SmsText.English;
        return new SmsRecipient(row.SmsAlertsEnabled, language, phone, SmsText.ToInternationalMobile(phone));
    }
}
