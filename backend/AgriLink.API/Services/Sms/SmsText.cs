namespace AgriLink.API.Services.Sms;

public static class SmsText
{
    public const string English = "en";
    public const string Sinhala = "si";
    public const string Tamil = "ta";

    public static readonly IReadOnlyList<string> Languages = [English, Sinhala, Tamil];

    public static bool IsSupportedLanguage(string? language) => language is English or Sinhala or Tamil;

    /// <summary>
    /// Turns a stored Sri Lankan mobile number (0771234567) into the 94771234567 form gateways
    /// want. Landlines (011..., 081...) can't take SMS, so they give null, as does anything malformed.
    /// </summary>
    public static string? ToInternationalMobile(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("94") && digits.Length == 11)
        {
            digits = "0" + digits[2..];
        }

        return digits.Length == 10 && digits.StartsWith("07") ? "94" + digits[1..] : null;
    }

    // Printable ASCII that GSM-7 can't send as one ordinary character: the backtick isn't in
    // GSM-7 at all, and the rest exist only as two-character escape sequences, which not every
    // gateway counts or converts correctly. Text containing any of them goes as Unicode instead.
    private const string NotPlainGsm7 = "`[]{}\\^~|";

    /// <summary>
    /// True when the text fits the cheaper GSM-7 encoding (160 characters per part): printable
    /// ASCII and new lines, minus the characters above. Anything else goes as Unicode (70 per part).
    /// </summary>
    public static bool IsGsm7(string text) =>
        text.All(c => (c is >= ' ' and <= '~' or '\n') && !NotPlainGsm7.Contains(c));

    /// <summary>
    /// Shortens user-written text (an issue title) so one alert stays a short message. Ends with
    /// three plain dots, not "…", which would turn an English text into a costlier Unicode one.
    /// </summary>
    public static string Clip(string text, int max)
    {
        var trimmed = text.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..(max - 3)].TrimEnd() + "...";
    }
}
