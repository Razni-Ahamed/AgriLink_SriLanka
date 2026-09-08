using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents;

// Supplies recent-weather context for a crop issue using Open-Meteo (https://open-meteo.com),
// a keyless public forecast API — the fallback provider the design doc allows while no official
// government weather API is publicly accessible.
public class WeatherAgent : IWeatherAgent
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<WeatherOptions> _options;
    private readonly ILogger<WeatherAgent> _logger;

    public WeatherAgent(HttpClient httpClient, IOptions<WeatherOptions> options, ILogger<WeatherAgent> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public Task<WeatherFindings> GetWeatherFindingsAsync(AgentContext context, CancellationToken cancellationToken)
    {
        // Farm.District is free text, so it is only ever used as a key into our own hardcoded table.
        // An unrecognized value stops here and never reaches the network.
        var coordinates = SriLankaDistrictCoordinates.Lookup(context.District);
        if (coordinates is null)
        {
            _logger.LogInformation("Weather lookup skipped: district not in the known Sri Lankan district list.");
            return Task.FromResult(new WeatherFindings
            {
                Summary = "Weather data unavailable (unrecognized district).",
                IsFallback = true,
                Notes = "District did not match any known Sri Lankan district.",
            });
        }

        return Task.FromResult(new WeatherFindings
        {
            Summary = "Weather lookup not yet implemented.",
            IsFallback = true,
            Notes = "Forecast retrieval pending.",
        });
    }
}
