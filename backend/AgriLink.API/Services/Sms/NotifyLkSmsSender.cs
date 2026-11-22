using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Sms;

/// <summary>
/// Notify.lk (https://notify.lk), a Sri Lankan SMS gateway. Its send API takes the account's
/// user id, API key and sender id as query parameters and answers {"status":"success",...}.
/// Sinhala and Tamil text is sent with type=unicode, which Notify.lk bills at 70 characters per part.
/// The HttpClient's own request logging is turned down in Program.cs so the key never reaches the logs.
/// </summary>
public sealed class NotifyLkSmsSender : ISmsSender
{
    public const string HttpClientName = "NotifyLk";

    private readonly HttpClient _http;
    private readonly NotifyLkOptions _options;
    private readonly ILogger<NotifyLkSmsSender> _logger;

    public NotifyLkSmsSender(HttpClient http, IOptions<SmsOptions> options, ILogger<NotifyLkSmsSender> logger)
    {
        _http = http;
        _options = options.Value.NotifyLk;
        _logger = logger;
    }

    public bool IsConfigured => _options.IsComplete;

    public async Task<bool> SendAsync(string internationalNumber, string text, CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            return false;
        }

        var query = new Dictionary<string, string>
        {
            ["user_id"] = _options.UserId!,
            ["api_key"] = _options.ApiKey!,
            ["sender_id"] = _options.SenderId!,
            ["to"] = internationalNumber,
            ["message"] = text,
        };
        if (!SmsText.IsGsm7(text))
        {
            query["type"] = "unicode";
        }

        var url = _options.BaseUrl + "?" + string.Join("&", query.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
        using var response = await _http.GetAsync(url, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (response.IsSuccessStatusCode && IsSuccessBody(body))
        {
            return true;
        }

        _logger.LogWarning(
            "Notify.lk did not send an SMS: HTTP {Status}, response {Body}",
            (int)response.StatusCode,
            body.Length > 300 ? body[..300] : body);
        return false;
    }

    private static bool IsSuccessBody(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("status", out var status)
                && string.Equals(status.GetString(), "success", StringComparison.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
