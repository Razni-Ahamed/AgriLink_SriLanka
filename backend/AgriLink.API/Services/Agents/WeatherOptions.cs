namespace AgriLink.API.Services.Agents;

public class WeatherOptions
{
    public string BaseUrl { get; set; } = "https://api.open-meteo.com/v1/forecast";
    public int TimeoutSeconds { get; set; } = 8;
}
