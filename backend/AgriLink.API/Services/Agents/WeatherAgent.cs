using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents;

// STUB — the Weather Agent owner replaces this body. Keep the class name, namespace,
// and constructor signature unchanged so the typed-HttpClient DI registration in
// Program.cs does not need to change.
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
        var findings = new WeatherFindings
        {
            Summary = "Weather lookup not yet implemented.",
            IsFallback = true,
            Notes = "STUB implementation.",
        };
        return Task.FromResult(findings);
    }
}
