using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;

namespace AgriLink.API.Services.Accounts;

/// <summary>
/// The one password check every security-changing endpoint runs before touching anything.
/// A missing password never reaches UserManager (an empty/null CheckPasswordAsync call is not
/// guaranteed to fail the same way across providers), so it's rejected here explicitly.
/// </summary>
public static class SecurityReauth
{
    public static Task<bool> VerifyAsync(
        UserManager<ApplicationUser> userManager, ApplicationUser user, string? currentPassword) =>
        string.IsNullOrEmpty(currentPassword)
            ? Task.FromResult(false)
            : userManager.CheckPasswordAsync(user, currentPassword);
}
