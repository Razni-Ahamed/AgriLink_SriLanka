using System.Text.RegularExpressions;

namespace AgriLink.API.Services.Accounts;

public enum UsernameCheck
{
    Valid,
    Invalid,
    Reserved,
}

/// <summary>
/// The rules for a username, in one place for sign-up, admin-created accounts, the profile editor and
/// the startup backfill. Mirrored client-side in frontend/src/lib/validation.ts.
///
/// Identity's own AllowedUserNameCharacters is left at its default on purpose: it is wider than these
/// rules, so it never rejects a valid username, and existing accounts (and tests) whose UserName is
/// still an email keep passing Identity's validator until the backfill replaces them.
/// </summary>
public static partial class UsernamePolicy
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    /// <summary>How long a user waits between the username changes they make themselves.</summary>
    public static readonly TimeSpan ChangeInterval = TimeSpan.FromDays(30);

    // Names that could pass for staff or for a route, so nobody can present as "admin" or "support".
    private static readonly HashSet<string> ReservedNames = new(StringComparer.Ordinal)
    {
        "admin", "administrator", "agrilink", "support", "system", "root", "officer",
        "farmer", "buyer", "null", "undefined", "me", "api", "help",
    };

    /// <summary>Trims and lowercases, so "  Nimal.Perera " and "nimal.perera" are the same username.</summary>
    public static string Normalize(string? username) => (username ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>Checks an already-normalized username against the format rules and the reserved list.</summary>
    public static UsernameCheck Check(string normalized)
    {
        if (normalized.Length is < MinLength or > MaxLength
            || !AllowedPattern().IsMatch(normalized)
            || normalized.Contains("..", StringComparison.Ordinal))
        {
            return UsernameCheck.Invalid;
        }

        return ReservedNames.Contains(normalized) ? UsernameCheck.Reserved : UsernameCheck.Valid;
    }

    public static bool IsAcceptable(string normalized) => Check(normalized) == UsernameCheck.Valid;

    /// <summary>A message safe to return to the client for a username that failed <see cref="Check"/>.</summary>
    public static string MessageFor(UsernameCheck check) => check switch
    {
        UsernameCheck.Reserved => "That username is reserved. Please choose another.",
        _ => $"Usernames must be {MinLength}–{MaxLength} characters: lowercase letters, numbers, dots and underscores, "
            + "starting and ending with a letter or number, with no two dots in a row.",
    };

    /// <summary>
    /// When the user may next change their username, or null when they may change it now.
    /// </summary>
    public static DateTime? NextChangeAllowedAt(DateTime? lastChangedAt, DateTime utcNow)
    {
        if (lastChangedAt is null)
        {
            return null;
        }

        var next = DateTime.SpecifyKind(lastChangedAt.Value, DateTimeKind.Utc) + ChangeInterval;
        return next > utcNow ? next : null;
    }

    [GeneratedRegex(@"^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?\z", RegexOptions.CultureInvariant)]
    private static partial Regex AllowedPattern();
}
