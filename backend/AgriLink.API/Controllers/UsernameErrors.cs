using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AgriLink.API.Controllers;

/// <summary>The one response every endpoint gives for a username someone else already holds.</summary>
internal static class UsernameErrors
{
    public const string DuplicateUserNameCode = "DuplicateUserName";

    /// <summary>
    /// Identity's own error shape and code, so the frontend's apiErrors helper maps it the same way
    /// whether the pre-check caught the clash or Identity (or the database) did.
    /// </summary>
    public static object TakenBody { get; } = new
    {
        errors = new[] { new { code = DuplicateUserNameCode, description = "That username is taken." } },
    };

    public static bool ContainsDuplicateUserName(IdentityResult result) =>
        result.Errors.Any(e => e.Code == DuplicateUserNameCode);

    /// <summary>
    /// True when a save failed on a unique index. Two requests can both pass the "is it free?" check
    /// before either saves; the database's unique index on NormalizedUserName is what finally decides.
    /// </summary>
    public static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    /// <summary>
    /// Creates the account, turning a username clash — whether Identity's validator or the unique index
    /// catches it — into null so the caller can answer 409 instead of 400 or 500.
    /// </summary>
    public static async Task<IdentityResult?> CreateOrNullOnDuplicateAsync(
        UserManager<ApplicationUser> userManager, ApplicationUser user, string password)
    {
        IdentityResult result;
        try
        {
            result = await userManager.CreateAsync(user, password);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            return null;
        }

        return !result.Succeeded && ContainsDuplicateUserName(result) ? null : result;
    }
}
