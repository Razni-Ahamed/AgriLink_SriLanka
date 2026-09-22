using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services.Accounts;

public static class UsernameAvailability
{
    public const string Invalid = "invalid";
    public const string Reserved = "reserved";
    public const string Taken = "taken";

    /// <summary>
    /// Why <paramref name="normalized"/> can't be used, or null when it can. Case-insensitive across every
    /// account and role, because it compares Identity's NormalizedUserName — the same column its unique
    /// index is on.
    /// </summary>
    /// <param name="exceptUserId">An account whose own current username counts as available.</param>
    public static async Task<string?> ReasonUnavailableAsync(
        UserManager<ApplicationUser> userManager,
        string normalized,
        int? exceptUserId,
        CancellationToken cancellationToken = default)
    {
        switch (UsernamePolicy.Check(normalized))
        {
            case UsernameCheck.Invalid:
                return Invalid;
            case UsernameCheck.Reserved:
                return Reserved;
        }

        var normalizedName = userManager.NormalizeName(normalized);
        var taken = await userManager.Users.AnyAsync(
            u => u.NormalizedUserName == normalizedName && (exceptUserId == null || u.Id != exceptUserId),
            cancellationToken);
        return taken ? Taken : null;
    }
}
