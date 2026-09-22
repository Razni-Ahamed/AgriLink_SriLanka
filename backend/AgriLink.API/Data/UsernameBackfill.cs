using AgriLink.API.Models;
using AgriLink.API.Services.Accounts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Data;

/// <summary>
/// Until usernames existed, every account's Identity UserName was its email. This gives each such
/// account a real username generated from its full name. It runs on every startup and only touches
/// accounts whose UserName still contains "@", so once they are converted it changes nothing.
/// </summary>
public static class UsernameBackfill
{
    public static async Task RunAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var pending = await userManager.Users
            .Where(u => u.UserName != null && u.UserName.Contains("@"))
            .OrderBy(u => u.Id)
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            return;
        }

        var converted = 0;
        var failed = 0;
        foreach (var user in pending)
        {
            var original = user.UserName;
            user.UserName = await UsernameGenerator.GenerateUniqueAsync(userManager, user.FullName, user.Id, cancellationToken);

            // UpdateAsync rather than SetUserNameAsync: both refresh NormalizedUserName, but
            // SetUserNameAsync also rotates the security stamp, which would sign every existing user
            // out on the deploy that introduces usernames. UsernameChangedAt stays null so each
            // user's first change of this generated name is free.
            var result = await userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                converted++;
            }
            else
            {
                // The entity stays tracked, so without this the next user's save would write the
                // rejected name anyway. The next startup retries this account.
                user.UserName = original;
                failed++;
            }
        }

        // Counts only: usernames are derived from names, and the old values are emails.
        logger.LogInformation("Username backfill: {Converted} account(s) given a username, {Failed} failed.", converted, failed);
    }
}
