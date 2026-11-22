namespace AgriLink.API.Services.Sms;

public enum SmsAlertKind
{
    /// <summary>To the farmer: a buyer asked for some of a listing. Subject = crop, Detail = amount.</summary>
    NewPurchaseRequest,

    /// <summary>To the buyer: the farmer accepted, so the order is confirmed. Subject = crop, Detail = amount.</summary>
    OrderConfirmed,

    /// <summary>To the farmer: an officer reviewed their crop issue. Subject = issue title.</summary>
    OfficerReplied,
}

/// <summary>What to tell the user. The words are chosen at send time, in the user's SMS language.</summary>
public sealed record SmsAlert(SmsAlertKind Kind, string Subject, string? Detail = null);

/// <summary>The alert texts in English, Sinhala and Tamil. Each starts with "AgriLink:" so people know who sent it.</summary>
public static class SmsTemplates
{
    private const int MaxSubjectLength = 40;

    public static string Render(SmsAlert alert, string? language)
    {
        var subject = SmsText.Clip(alert.Subject, MaxSubjectLength);
        var detail = alert.Detail ?? string.Empty;

        return (alert.Kind, language) switch
        {
            (SmsAlertKind.NewPurchaseRequest, SmsText.Sinhala) =>
                $"AgriLink: ඔබේ {subject} අස්වැන්නෙන් {detail} සඳහා නව ඉල්ලීමක් ලැබී ඇත. පිළිගැනීමට හෝ ප්‍රතික්ෂේප කිරීමට AgriLink විවෘත කරන්න.",
            (SmsAlertKind.NewPurchaseRequest, SmsText.Tamil) =>
                $"AgriLink: உங்கள் {subject} விளைச்சலில் {detail} வேண்டும் என்று புதிய கோரிக்கை வந்துள்ளது. ஏற்க அல்லது நிராகரிக்க AgriLink-ஐத் திறக்கவும்.",
            (SmsAlertKind.NewPurchaseRequest, _) =>
                $"AgriLink: New request for {detail} of your {subject}. Open AgriLink to accept or decline it.",

            (SmsAlertKind.OrderConfirmed, SmsText.Sinhala) =>
                $"AgriLink: {subject} {detail} සඳහා ඔබේ ඉල්ලීම ගොවියා පිළිගත්තේය. ඔබේ ඇණවුම තහවුරු විය.",
            (SmsAlertKind.OrderConfirmed, SmsText.Tamil) =>
                $"AgriLink: {subject} {detail} க்கான உங்கள் கோரிக்கையை விவசாயி ஏற்றுக்கொண்டார். உங்கள் ஆர்டர் உறுதிசெய்யப்பட்டது.",
            (SmsAlertKind.OrderConfirmed, _) =>
                $"AgriLink: The farmer accepted your request for {detail} of {subject}. Your order is confirmed.",

            (SmsAlertKind.OfficerReplied, SmsText.Sinhala) =>
                $"AgriLink: \"{subject}\" ගැන කෘෂිකර්ම නිලධාරියෙක් පිළිතුරු දී ඇත. උපදෙස් කියවීමට AgriLink විවෘත කරන්න.",
            (SmsAlertKind.OfficerReplied, SmsText.Tamil) =>
                $"AgriLink: \"{subject}\" குறித்து வேளாண் அலுவலர் பதிலளித்துள்ளார். ஆலோசனையைப் படிக்க AgriLink-ஐத் திறக்கவும்.",
            (SmsAlertKind.OfficerReplied, _) =>
                $"AgriLink: An agricultural officer replied about \"{subject}\". Open AgriLink to read the advice.",

            _ => throw new ArgumentOutOfRangeException(nameof(alert), alert.Kind, "Unknown SMS alert kind."),
        };
    }
}
