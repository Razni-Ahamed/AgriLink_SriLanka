using System.Net.Mail;
using System.Text.RegularExpressions;

namespace AgriLink.API.Services.Accounts;

/// <summary>
/// NIC, phone and email rules shared by every endpoint that accepts them (registration, the
/// security tab's direct changes and change requests, admin editing). One copy so a server-side
/// rule can never drift between callers; mirrored client-side in frontend/src/lib/validation.ts.
/// </summary>
public static partial class IdentityFieldNormalization
{
    /// <summary>
    /// Accepts the new 12-digit format and the old 9-digit-plus-letter format, trims surrounding
    /// whitespace, and uppercases the trailing letter so "901234567v" and "901234567V" are stored
    /// identically. Returns null when neither format matches.
    /// </summary>
    public static string? NormalizeNic(string? nic)
    {
        if (string.IsNullOrWhiteSpace(nic))
        {
            return null;
        }

        var trimmed = nic.Trim();
        if (NewFormatNic().IsMatch(trimmed))
        {
            return trimmed;
        }

        if (OldFormatNic().IsMatch(trimmed))
        {
            return trimmed[..9] + char.ToUpperInvariant(trimmed[9]);
        }

        return null;
    }

    /// <summary>
    /// Strips spaces and dashes so "077 123 4567" and "077-123-4567" both normalize to
    /// "0771234567". Returns null unless the result is exactly 10 digits.
    /// </summary>
    public static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var digitsOnly = phone.Replace(" ", string.Empty).Replace("-", string.Empty);
        return TenDigits().IsMatch(digitsOnly) ? digitsOnly : null;
    }

    /// <summary>Trims and validates the shape of an email address; does not check uniqueness.</summary>
    public static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        try
        {
            return new MailAddress(email.Trim()).Address == email.Trim();
        }
        catch (FormatException)
        {
            return false;
        }
    }

    [GeneratedRegex(@"^\d{12}$")]
    private static partial Regex NewFormatNic();

    [GeneratedRegex(@"^\d{9}[VvXx]$")]
    private static partial Regex OldFormatNic();

    [GeneratedRegex(@"^\d{10}$")]
    private static partial Regex TenDigits();
}
