namespace AgriLink.API.Services.Sms;

/// <summary>
/// Text message alerts. Off unless <see cref="Provider"/> names a gateway and its settings are
/// filled in; until then nothing is sent and the rest of the app works exactly as before.
/// Keep the API key out of appsettings.json: set it as <c>Sms__NotifyLk__ApiKey</c> in the
/// environment or the host's app settings.
/// </summary>
public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>"NotifyLk" turns on Notify.lk. Empty or anything else means no SMS.</summary>
    public string? Provider { get; set; }

    public NotifyLkOptions NotifyLk { get; set; } = new();

    /// <summary>Alerts waiting to be sent. When the queue is full, new alerts are dropped (and logged).</summary>
    public int QueueCapacity { get; set; } = 1000;

    public int TimeoutSeconds { get; set; } = 10;

    /// <summary>
    /// The most texts one user gets in any 24 hours. Every text costs money, and any buyer can
    /// make a farmer's phone buzz by sending purchase requests, so this caps what one account can
    /// cost and how much one phone is disturbed. 0 or less means no daily cap.
    /// </summary>
    public int MaxPerUserPerDay { get; set; } = 10;

    /// <summary>
    /// A repeat of the same alert (same user, kind and crop or issue) within this many minutes
    /// is not texted again; the in-app notification still arrives. 0 or less turns this off.
    /// </summary>
    public int RepeatCooldownMinutes { get; set; } = 30;

    /// <summary>True when a known provider is chosen and all of its settings are filled in.</summary>
    public bool IsEnabled =>
        string.Equals(Provider, NotifyLkProvider, StringComparison.OrdinalIgnoreCase) && NotifyLk.IsComplete;

    public const string NotifyLkProvider = "NotifyLk";
}

public class NotifyLkOptions
{
    public string BaseUrl { get; set; } = "https://app.notify.lk/api/v1/send";
    public string? UserId { get; set; }
    public string? ApiKey { get; set; }

    /// <summary>The approved sender name; Notify.lk's shared "NotifyDEMO" works only for testing.</summary>
    public string? SenderId { get; set; }

    public bool IsComplete =>
        !string.IsNullOrWhiteSpace(UserId) && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(SenderId);
}
