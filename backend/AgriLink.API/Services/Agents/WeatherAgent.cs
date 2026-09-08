using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents;

// Supplies recent-weather context for a crop issue using Open-Meteo (https://open-meteo.com),
// a keyless public forecast API — the fallback provider the design doc allows while no official
// government weather API is publicly accessible.
public class WeatherAgent : IWeatherAgent
{
    private const int PastDays = 7;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly IOptions<WeatherOptions> _options;
    private readonly ILogger<WeatherAgent> _logger;

    public WeatherAgent(HttpClient httpClient, IOptions<WeatherOptions> options, ILogger<WeatherAgent> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task<WeatherFindings> GetWeatherFindingsAsync(AgentContext context, CancellationToken cancellationToken)
    {
        // Farm.District is free text, so it is only ever used as a key into our own hardcoded table.
        // An unrecognized value stops here and never reaches the network.
        var coordinates = SriLankaDistrictCoordinates.Lookup(context.District);
        if (coordinates is null)
        {
            _logger.LogInformation("Weather lookup skipped: district not in the known Sri Lankan district list.");
            return new WeatherFindings
            {
                Summary = "Weather data unavailable (unrecognized district).",
                IsFallback = true,
                Notes = "District did not match any known Sri Lankan district.",
            };
        }

        // A brief outage of a public weather API must never fail issue creation, so every failure
        // below degrades to a fallback finding rather than propagating out of this agent.
        try
        {
            var url = BuildRequestUrl(coordinates.Value);

            // The typed-client registration in Program.cs already applies the configured timeout.
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return Unavailable($"Weather provider returned HTTP {(int)response.StatusCode}.");
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<OpenMeteoResponse>(stream, JsonOptions, cancellationToken);

            return BuildFindings(payload?.Daily);
        }
        catch (HttpRequestException)
        {
            return Unavailable("Weather provider could not be reached.");
        }
        catch (TaskCanceledException)
        {
            return Unavailable("Weather provider request timed out.");
        }
        catch (JsonException)
        {
            return Unavailable("Weather provider returned an unreadable response.");
        }
        catch (Exception)
        {
            return Unavailable("Unexpected error during weather lookup.");
        }
    }

    private WeatherFindings Unavailable(string reason)
    {
        // Message only — never the exception detail or the response body — to keep production logs small.
        _logger.LogWarning("Weather lookup fell back: {Reason}", reason);
        return new WeatherFindings
        {
            Summary = "Weather data temporarily unavailable.",
            IsFallback = true,
            Notes = reason,
        };
    }

    // Built only from the numeric centroid taken from our own static table, never from the raw
    // district string, and every value is escaped by the query-string helper.
    private string BuildRequestUrl((double Lat, double Lon) coordinates)
    {
        var parameters = new Dictionary<string, string?>
        {
            ["latitude"] = coordinates.Lat.ToString(CultureInfo.InvariantCulture),
            ["longitude"] = coordinates.Lon.ToString(CultureInfo.InvariantCulture),
            ["daily"] = "precipitation_sum,temperature_2m_max,temperature_2m_min",
            ["past_days"] = PastDays.ToString(CultureInfo.InvariantCulture),
            ["forecast_days"] = "1",
            ["timezone"] = "Asia/Colombo",
        };

        return QueryHelpers.AddQueryString(_options.Value.BaseUrl, parameters);
    }

    private WeatherFindings BuildFindings(OpenMeteoDaily? daily)
    {
        var rainfall = Sum(daily?.PrecipitationSum);
        var temperature = Average(daily?.TemperatureMax, daily?.TemperatureMin);

        // A well-formed response carrying no usable readings is still no weather context, and
        // ValidationAgent reads IsFallback to decide whether to discount its confidence.
        if (rainfall is null && temperature is null)
        {
            return Unavailable("Weather provider returned no usable readings.");
        }

        return new WeatherFindings
        {
            Summary = Describe(rainfall, temperature),
            RecentRainfallMm = rainfall,
            AvgTemperatureC = temperature,
            IsFallback = false,
        };
    }

    private static string Describe(double? rainfallMm, double? avgTemperatureC)
    {
        var rain = rainfallMm is null
            ? "Rainfall data unavailable"
            : $"{rainfallMm.Value.ToString("F1", CultureInfo.InvariantCulture)}mm rain over the last {PastDays} days";

        var temp = avgTemperatureC is null
            ? "average temperature unavailable"
            : $"avg temp {avgTemperatureC.Value.ToString("F1", CultureInfo.InvariantCulture)}°C";

        return $"{rain}, {temp}.";
    }

    private static double? Sum(IReadOnlyList<double?>? values)
    {
        var present = values?.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return present is { Count: > 0 } ? Math.Round(present.Sum(), 1) : null;
    }

    private static double? Average(IReadOnlyList<double?>? highs, IReadOnlyList<double?>? lows)
    {
        var present = (highs ?? Array.Empty<double?>())
            .Concat(lows ?? Array.Empty<double?>())
            .Where(v => v.HasValue)
            .Select(v => v!.Value)
            .ToList();

        return present.Count > 0 ? Math.Round(present.Average(), 1) : null;
    }

    private sealed record OpenMeteoResponse
    {
        [JsonPropertyName("daily")]
        public OpenMeteoDaily? Daily { get; init; }
    }

    private sealed record OpenMeteoDaily
    {
        [JsonPropertyName("precipitation_sum")]
        public IReadOnlyList<double?>? PrecipitationSum { get; init; }

        [JsonPropertyName("temperature_2m_max")]
        public IReadOnlyList<double?>? TemperatureMax { get; init; }

        [JsonPropertyName("temperature_2m_min")]
        public IReadOnlyList<double?>? TemperatureMin { get; init; }
    }
}
