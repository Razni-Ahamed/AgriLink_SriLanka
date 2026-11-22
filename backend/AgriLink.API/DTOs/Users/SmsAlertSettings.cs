namespace AgriLink.API.DTOs.Users;

public class SmsAlertSettingsResponse
{
    /// <summary>False until the server has an SMS gateway configured; the UI then explains that.</summary>
    public bool Available { get; set; }
    public bool Enabled { get; set; }

    /// <summary>"en", "si" or "ta".</summary>
    public string Language { get; set; } = "en";

    /// <summary>The number alerts go to, as stored (0771234567), or null if the account has none.</summary>
    public string? PhoneNumber { get; set; }

    /// <summary>False for a missing number or a landline, which can't receive SMS.</summary>
    public bool PhoneCanReceiveSms { get; set; }
}

public class UpdateSmsAlertSettingsRequest
{
    /// <summary>Null keeps the current value.</summary>
    public bool? Enabled { get; set; }

    /// <summary>"en", "si" or "ta"; null keeps the current value.</summary>
    public string? Language { get; set; }
}
