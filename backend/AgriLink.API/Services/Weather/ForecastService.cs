using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using AgriLink.API.DTOs.Weather;
using AgriLink.API.Services.Agents;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Weather;

public interface IForecastService
{
    /// <summary>
    /// The forecast for a Sri Lankan district, or null when the district isn't one we know or the
    /// weather provider can't be reached. Never throws for provider problems.
    /// </summary>
    Task<DistrictForecastResponse?> GetForecastAsync(string district, CancellationToken cancellationToken);

    /// <summary>Whether the name is one of the districts we have coordinates for.</summary>
    bool IsKnownDistrict(string district);
}

/// <summary>
/// The farmer-facing forecast, from the same keyless Open-Meteo API and the same district table the
/// crop-analysis WeatherAgent uses. The district name only ever selects a row in our own table; it
/// never reaches the provider's URL. Each district is cached for half an hour, so a district's
/// farmers opening their home page cost one provider call per half hour between them.
/// </summary>
public class ForecastService : IForecastService
{
    public static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    /// <summary>How many upcoming hours to return, and how far apart.</summary>
    private const int HourCount = 4;
    private const int HourStep = 3;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;
    private readonly IOptions<WeatherOptions> _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ForecastService> _logger;

    public ForecastService(
        HttpClient httpClient,
        IOptions<WeatherOptions> options,
        IMemoryCache cache,
        ILogger<ForecastService> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    public bool IsKnownDistrict(string district) => SriLankaDistrictCoordinates.Lookup(district) is not null;

    public async Task<DistrictForecastResponse?> GetForecastAsync(string district, CancellationToken cancellationToken)
    {
        var coordinates = SriLankaDistrictCoordinates.Lookup(district);
        if (coordinates is null)
        {
            return null;
        }

        var key = "forecast:" + district.Trim().ToLowerInvariant();
        if (_cache.TryGetValue(key, out DistrictForecastResponse? cached) && cached is not null)
        {
            return cached;
        }

        var forecast = await FetchAsync(district.Trim(), coordinates.Value, cancellationToken);
        if (forecast is not null)
        {
            // Failures aren't cached, so the next visit tries again.
            _cache.Set(key, forecast, CacheDuration);
        }
        return forecast;
    }

    private async Task<DistrictForecastResponse?> FetchAsync(
        string district,
        (double Lat, double Lon) coordinates,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(BuildRequestUrl(coordinates), cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return Unavailable($"Weather provider returned HTTP {(int)response.StatusCode}.");
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<OpenMeteoForecast>(stream, JsonOptions, cancellationToken);
            return payload?.Current is null ? Unavailable("Weather provider returned no current readings.") : Build(district, payload);
        }
        catch (HttpRequestException)
        {
            return Unavailable("Weather provider could not be reached.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Unavailable("Weather provider request timed out.");
        }
        catch (JsonException)
        {
            return Unavailable("Weather provider returned an unreadable response.");
        }
    }

    private DistrictForecastResponse? Unavailable(string reason)
    {
        // The reason only, never the response body, to keep logs small.
        _logger.LogWarning("Forecast unavailable: {Reason}", reason);
        return null;
    }

    private string BuildRequestUrl((double Lat, double Lon) coordinates)
    {
        var parameters = new Dictionary<string, string?>
        {
            ["latitude"] = coordinates.Lat.ToString(CultureInfo.InvariantCulture),
            ["longitude"] = coordinates.Lon.ToString(CultureInfo.InvariantCulture),
            ["current"] = "temperature_2m,weather_code,is_day",
            ["hourly"] = "temperature_2m,precipitation_probability,weather_code",
            ["daily"] = "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
            // Two days, so "the next few hours" still works late in the evening.
            ["forecast_days"] = "2",
            ["timezone"] = "Asia/Colombo",
        };
        return QueryHelpers.AddQueryString(_options.Value.BaseUrl, parameters);
    }

    internal static DistrictForecastResponse Build(string district, OpenMeteoForecast payload)
    {
        var current = payload.Current!;
        var hourly = payload.Hourly;
        var daily = payload.Daily;

        // The first hour after "now", then every few hours from there.
        var hours = new List<HourlyWeather>();
        if (hourly?.Time is { Count: > 0 } times)
        {
            var start = 0;
            while (start < times.Count && string.CompareOrdinal(times[start], current.Time) <= 0)
            {
                start++;
            }
            for (var i = start; i < times.Count && hours.Count < HourCount; i += HourStep)
            {
                hours.Add(new HourlyWeather
                {
                    Time = times[i],
                    TemperatureC = At(hourly.Temperature, i),
                    RainChancePercent = (int?)At(hourly.PrecipitationProbability, i),
                    WeatherCode = (int?)At(hourly.WeatherCode, i),
                });
            }
        }

        return new DistrictForecastResponse
        {
            District = district,
            Current = new CurrentWeather
            {
                Time = current.Time ?? string.Empty,
                TemperatureC = current.Temperature ?? 0,
                WeatherCode = current.WeatherCode ?? 0,
                IsDay = current.IsDay != 0,
            },
            Today = new TodayWeather
            {
                MaxC = At(daily?.TemperatureMax, 0),
                MinC = At(daily?.TemperatureMin, 0),
                RainMm = At(daily?.PrecipitationSum, 0),
                RainChancePercent = (int?)At(daily?.PrecipitationProbabilityMax, 0),
            },
            Hours = hours,
        };
    }

    private static double? At(IReadOnlyList<double?>? values, int index) =>
        values is not null && index < values.Count ? values[index] : null;

    internal sealed record OpenMeteoForecast
    {
        [JsonPropertyName("current")]
        public OpenMeteoCurrent? Current { get; init; }

        [JsonPropertyName("hourly")]
        public OpenMeteoHourly? Hourly { get; init; }

        [JsonPropertyName("daily")]
        public OpenMeteoDaily? Daily { get; init; }
    }

    internal sealed record OpenMeteoCurrent
    {
        [JsonPropertyName("time")]
        public string? Time { get; init; }

        [JsonPropertyName("temperature_2m")]
        public double? Temperature { get; init; }

        [JsonPropertyName("weather_code")]
        public int? WeatherCode { get; init; }

        [JsonPropertyName("is_day")]
        public int? IsDay { get; init; }
    }

    internal sealed record OpenMeteoHourly
    {
        [JsonPropertyName("time")]
        public IReadOnlyList<string>? Time { get; init; }

        [JsonPropertyName("temperature_2m")]
        public IReadOnlyList<double?>? Temperature { get; init; }

        [JsonPropertyName("precipitation_probability")]
        public IReadOnlyList<double?>? PrecipitationProbability { get; init; }

        [JsonPropertyName("weather_code")]
        public IReadOnlyList<double?>? WeatherCode { get; init; }
    }

    internal sealed record OpenMeteoDaily
    {
        [JsonPropertyName("temperature_2m_max")]
        public IReadOnlyList<double?>? TemperatureMax { get; init; }

        [JsonPropertyName("temperature_2m_min")]
        public IReadOnlyList<double?>? TemperatureMin { get; init; }

        [JsonPropertyName("precipitation_sum")]
        public IReadOnlyList<double?>? PrecipitationSum { get; init; }

        [JsonPropertyName("precipitation_probability_max")]
        public IReadOnlyList<double?>? PrecipitationProbabilityMax { get; init; }
    }
}
