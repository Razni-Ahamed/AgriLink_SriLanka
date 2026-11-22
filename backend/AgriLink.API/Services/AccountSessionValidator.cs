using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services;

public class AccountSessionValidator : IAccountSessionValidator
{
    private readonly AgriLinkDbContext _db;
    private readonly AccountStateCache? _cache;

    /// <summary>Always reads the database (no cache). Used by tests that check the rule itself.</summary>
    public AccountSessionValidator(AgriLinkDbContext db) : this(db, null)
    {
    }

    public AccountSessionValidator(AgriLinkDbContext db, AccountStateCache? cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<bool> IsValidAsync(int userId, string? stampClaim, CancellationToken cancellationToken)
    {
        var user = _cache is null
            ? await LoadAsync(userId, cancellationToken)
            : await _cache.GetOrLoadAsync(userId, ct => LoadAsync(userId, ct), cancellationToken);

        if (user is null || !user.IsActive || user.RegistrationStatus != RegistrationStatus.Approved)
        {
            return false;
        }

        // A token minted before this claim existed carries none. Rather than special-case it as
        // "still valid", it is rejected like a stale one — the account holder logs in once more
        // after this deploy and gets a token that does carry the current stamp.
        return !string.IsNullOrEmpty(stampClaim) && string.Equals(stampClaim, user.SecurityStamp, StringComparison.Ordinal);
    }

    private Task<AccountState?> LoadAsync(int userId, CancellationToken cancellationToken) =>
        _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new AccountState(u.IsActive, u.RegistrationStatus, u.SecurityStamp))
            .FirstOrDefaultAsync(cancellationToken);
}
