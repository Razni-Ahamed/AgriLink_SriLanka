namespace AgriLink.API.Services;

public interface IAccountSessionValidator
{
    /// <summary>
    /// True when userId still has a usable account (active, approved) and the token's "stamp"
    /// claim matches the user's current SecurityStamp. Pulled out of Program.cs's
    /// JwtBearerEvents.OnTokenValidated so the rule can be unit tested directly instead of only
    /// through a live authentication pipeline.
    /// </summary>
    Task<bool> IsValidAsync(int userId, string? stampClaim, CancellationToken cancellationToken);
}
