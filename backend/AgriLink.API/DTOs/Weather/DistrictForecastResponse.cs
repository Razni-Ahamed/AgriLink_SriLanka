namespace AgriLink.API.DTOs.Weather;

/// <summary>
/// The forecast for one district, for the farmer's home page: what it is like now, today's range
/// and rain, and the next few hours. Times are local Sri Lanka time ("2026-11-15T15:00"), as the
/// weather provider gives them. Weather codes are the WMO codes Open-Meteo uses.
/// </summary>
public record DistrictForecastResponse
{
    public string District { get; init; } = string.Empty;
    public CurrentWeather Current { get; init; } = new();
    public TodayWeather Today { get; init; } = new();
    public IReadOnlyList<HourlyWeather> Hours { get; init; } = Array.Empty<HourlyWeather>();
}

public record CurrentWeather
{
    public string Time { get; init; } = string.Empty;
    public double TemperatureC { get; init; }
    public int WeatherCode { get; init; }
    public bool IsDay { get; init; } = true;
}

public record TodayWeather
{
    public double? MaxC { get; init; }
    public double? MinC { get; init; }
    public double? RainMm { get; init; }
    public int? RainChancePercent { get; init; }
}

public record HourlyWeather
{
    public string Time { get; init; } = string.Empty;
    public double? TemperatureC { get; init; }
    public int? RainChancePercent { get; init; }
    public int? WeatherCode { get; init; }
}
