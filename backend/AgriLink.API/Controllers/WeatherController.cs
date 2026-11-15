using AgriLink.API.DTOs.Weather;
using AgriLink.API.Services.Weather;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriLink.API.Controllers;

/// <summary>
/// The weather for a district, for the farmer's home page. Signed-in users only, so the cached
/// provider calls can't be driven by anonymous traffic.
/// </summary>
[ApiController]
[Route("api/weather")]
[Authorize]
public class WeatherController : ControllerBase
{
    private readonly IForecastService _forecasts;

    public WeatherController(IForecastService forecasts)
    {
        _forecasts = forecasts;
    }

    /// <summary>404 for a district we don't know; 503 while the weather provider is unavailable.</summary>
    [HttpGet("{district}")]
    public async Task<ActionResult<DistrictForecastResponse>> Get(string district, CancellationToken cancellationToken)
    {
        if (!_forecasts.IsKnownDistrict(district))
        {
            return NotFound();
        }

        var forecast = await _forecasts.GetForecastAsync(district, cancellationToken);
        return forecast is null ? StatusCode(StatusCodes.Status503ServiceUnavailable) : Ok(forecast);
    }
}
