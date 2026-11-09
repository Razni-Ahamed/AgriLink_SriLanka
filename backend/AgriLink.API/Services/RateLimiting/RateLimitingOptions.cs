namespace AgriLink.API.Services.RateLimiting;

/// <summary>
/// How many requests a caller may make before the API answers 429. Each limit is a fixed window:
/// <c>PermitLimit</c> requests per <c>WindowSeconds</c>. Signed-in callers are counted per account
/// and anonymous ones per IP address, except the sign-in limit, which is always per IP address.
/// Every value can be changed on a host with an app setting such as <c>RateLimiting__AuthPermitLimit</c>.
/// </summary>
public class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    /// <summary>Off only for local experiments; the limits are cheap and stay on everywhere else.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Sign-in, admin sign-in, registration and password checks, per IP address. Account
    /// lockout already stops guessing one account's password; this stops trying many accounts.
    /// Generous because many phones on a mobile network can share one address.</summary>
    public int AuthPermitLimit { get; set; } = 20;

    public int AuthWindowSeconds { get; set; } = 60;

    /// <summary>Crop issue reports and profile photos. Each runs photo inference, the Planner (which
    /// may call the language model) or image processing, so they are the most expensive calls.</summary>
    public int UploadPermitLimit { get; set; } = 10;

    public int UploadWindowSeconds { get; set; } = 600;

    /// <summary>Chat messages, new chats and chat reports.</summary>
    public int ChatPermitLimit { get; set; } = 30;

    public int ChatWindowSeconds { get; set; } = 60;

    /// <summary>Every request, as a backstop against scripts. The apps poll notifications and open
    /// chats every 10–60 seconds, which stays far below this.</summary>
    public int GlobalPermitLimit { get; set; } = 300;

    public int GlobalWindowSeconds { get; set; } = 60;
}
