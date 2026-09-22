using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services;

public class AccountSessionValidator : IAccountSessionValidator
{
    private readonly AgriLinkDbContext _db;

    public AccountSessionValidator(AgriLinkDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsValidAsync(int userId, string? stampClaim, CancellationToken cancellationToken)
    {
        var user = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsActive, u.RegistrationStatus, u.SecurityStamp })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null || !user.IsActive || user.RegistrationStatus != RegistrationStatus.Approved)
        {
            return false;
        }

        // A token minted before this claim existed carries none. Rather than special-case it as
        // "still valid", it is rejected like a stale one — the account holder logs in once more
        // after this deploy and gets a token that does carry the current stamp.
        return !string.IsNullOrEmpty(stampClaim) && string.Equals(stampClaim, user.SecurityStamp, StringComparison.Ordinal);
    }
}
