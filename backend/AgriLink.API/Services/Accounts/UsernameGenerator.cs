using System.Globalization;
using System.Text;
using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services.Accounts;

/// <summary>
/// Picks a username for an account whose owner didn't choose one: existing accounts during the
/// startup backfill, admin-created accounts left blank, and the seeded admin.
/// </summary>
public static class UsernameGenerator
{
    private const string Fallback = "user";

    /// <summary>
    /// Builds the preferred username from a full name — "Nimal Perera" becomes "nimal.perera". Accents
    /// are folded ("José" → "jose"); anything else outside a–z and 0–9 separates words. Names written
    /// only in Sinhala or Tamil script leave nothing usable, and the caller falls back to "user".
    /// </summary>
    public static string BaseFromFullName(string? fullName)
    {
        var folded = (fullName ?? string.Empty).Normalize(NormalizationForm.FormD);
        var words = new List<string>();
        var current = new StringBuilder();

        foreach (var ch in folded)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(ch);
            if (lower is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                current.Append(lower);
            }
            else if (current.Length > 0)
            {
                words.Add(current.ToString());
                current.Clear();
            }
        }

        if (current.Length > 0)
        {
            words.Add(current.ToString());
        }

        var joined = Truncate(string.Join('.', words), UsernamePolicy.MaxLength);
        return joined.Length >= UsernamePolicy.MinLength ? joined : string.Empty;
    }

    /// <summary>
    /// Returns a username derived from <paramref name="fullName"/> that passes <see cref="UsernamePolicy"/>
    /// and no other account holds: "nimal.perera", then "nimal.perera2", "nimal.perera3", ...
    /// </summary>
    /// <param name="userId">The account's id when it already exists: gives the "user42" fallback and
    /// lets the account's own current username count as free.</param>
    public static async Task<string> GenerateUniqueAsync(
        UserManager<ApplicationUser> userManager,
        string? fullName,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        var baseName = BaseFromFullName(fullName);
        if (baseName.Length == 0)
        {
            baseName = userId is null ? Fallback : $"{Fallback}{userId}";
        }

        for (var attempt = 1; ; attempt++)
        {
            var suffix = attempt == 1 ? string.Empty : attempt.ToString(CultureInfo.InvariantCulture);
            var candidate = Truncate(baseName, UsernamePolicy.MaxLength - suffix.Length) + suffix;

            if (!UsernamePolicy.IsAcceptable(candidate))
            {
                continue;
            }

            var normalized = userManager.NormalizeName(candidate);
            var taken = await userManager.Users.AnyAsync(
                u => u.NormalizedUserName == normalized && (userId == null || u.Id != userId),
                cancellationToken);
            if (!taken)
            {
                return candidate;
            }
        }
    }

    // Cutting a dotted name can leave a trailing separator ("nimal." from "nimal.perera"), which the
    // policy refuses, so it is trimmed off along with the excess.
    private static string Truncate(string value, int maxLength)
    {
        var cut = value.Length > maxLength ? value[..maxLength] : value;
        return cut.TrimEnd('.', '_');
    }
}
