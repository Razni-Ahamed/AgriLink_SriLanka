using System.Net;
using System.Text;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Weather;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AgriLink.API.Tests.Services;

public class ForecastServiceTests
{
    private const string BaseUrl = "https://weather.test/v1/forecast";

    // "Now" is 14:15, so the first upcoming hour is 15:00, then every three hours.
    private const string ForecastJson = """
        {
          "current": { "time": "2026-11-15T14:15", "temperature_2m": 31.4, "weather_code": 2, "is_day": 1 },
          "hourly": {
            "time": ["2026-11-15T13:00","2026-11-15T14:00","2026-11-15T15:00","2026-11-15T16:00","2026-11-15T17:00",
                     "2026-11-15T18:00","2026-11-15T19:00","2026-11-15T20:00","2026-11-15T21:00","2026-11-15T22:00",
                     "2026-11-15T23:00","2026-11-16T00:00","2026-11-16T01:00","2026-11-16T02:00"],
            "temperature_2m": [32,31.5,31,30,29,28,27,26.5,26,25.5,25,24.8,24.5,24.2],
            "precipitation_probability": [10,15,70,80,60,40,30,20,10,5,5,5,5,5],
            "weather_code": [2,2,61,63,61,3,3,3,2,1,1,1,0,0]
          },
          "daily": {
            "temperature_2m_max": [32.6, 31.0],
            "temperature_2m_min": [24.1, 23.8],
            "precipitation_sum": [12.4, 3.0],
            "precipitation_probability_max": [80, 40]
          }
        }
        """;

    private static (ForecastService Service, FakeHandler Handler) Create(Func<HttpResponseMessage> respond)
    {
        var handler = new FakeHandler(respond);
        var service = new ForecastService(
            new HttpClient(handler),
            Options.Create(new WeatherOptions { BaseUrl = BaseUrl, TimeoutSeconds = 8 }),
            new MemoryCache(new MemoryCacheOptions()),
            Mock.Of<ILogger<ForecastService>>());
        return (service, handler);
    }

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json"),
    };

    [Fact]
    public async Task GetForecastAsync_ReadsNowTodayAndTheNextHours()
    {
        var (service, _) = Create(() => Json(ForecastJson));

        var forecast = await service.GetForecastAsync("Kurunegala", CancellationToken.None);

        Assert.NotNull(forecast);
        Assert.Equal("Kurunegala", forecast.District);
        Assert.Equal(31.4, forecast.Current.TemperatureC);
        Assert.Equal(2, forecast.Current.WeatherCode);
        Assert.True(forecast.Current.IsDay);
        Assert.Equal(32.6, forecast.Today.MaxC);
        Assert.Equal(24.1, forecast.Today.MinC);
        Assert.Equal(12.4, forecast.Today.RainMm);
        Assert.Equal(80, forecast.Today.RainChancePercent);

        Assert.Equal(
            new[] { "2026-11-15T15:00", "2026-11-15T18:00", "2026-11-15T21:00", "2026-11-16T00:00" },
            forecast.Hours.Select(hour => hour.Time));
        Assert.Equal(70, forecast.Hours[0].RainChancePercent);
        Assert.Equal(61, forecast.Hours[0].WeatherCode);
        Assert.Equal(31, forecast.Hours[0].TemperatureC);
    }

    [Fact]
    public async Task GetForecastAsync_AsksForTheDistrictCentroidInLocalTime()
    {
        var (service, handler) = Create(() => Json(ForecastJson));

        await service.GetForecastAsync("kandy", CancellationToken.None);

        var url = Assert.Single(handler.Requests).ToString();
        var kandy = SriLankaDistrictCoordinates.Lookup("Kandy")!.Value;
        Assert.StartsWith(BaseUrl, url);
        Assert.Contains($"latitude={kandy.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture)}", url);
        Assert.Contains("timezone=Asia%2FColombo", url);
        Assert.DoesNotContain("kandy", url, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetForecastAsync_CachesEachDistrict()
    {
        var (service, handler) = Create(() => Json(ForecastJson));

        await service.GetForecastAsync("Galle", CancellationToken.None);
        await service.GetForecastAsync(" galle ", CancellationToken.None);

        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task GetForecastAsync_UnknownDistrict_ReturnsNullWithoutCallingTheProvider()
    {
        var (service, handler) = Create(() => Json(ForecastJson));

        var forecast = await service.GetForecastAsync("Atlantis", CancellationToken.None);

        Assert.Null(forecast);
        Assert.Empty(handler.Requests);
        Assert.False(service.IsKnownDistrict("Atlantis"));
        Assert.True(service.IsKnownDistrict("Matale"));
    }

    [Fact]
    public async Task GetForecastAsync_ProviderDown_ReturnsNullAndDoesNotCacheTheFailure()
    {
        var calls = 0;
        var (service, handler) = Create(() =>
        {
            calls++;
            return calls == 1 ? new HttpResponseMessage(HttpStatusCode.ServiceUnavailable) : Json(ForecastJson);
        });

        Assert.Null(await service.GetForecastAsync("Badulla", CancellationToken.None));
        Assert.NotNull(await service.GetForecastAsync("Badulla", CancellationToken.None));
        Assert.Equal(2, handler.Requests.Count);
    }

    [Fact]
    public async Task GetForecastAsync_UnreadableResponse_ReturnsNull()
    {
        var (service, _) = Create(() => Json("not json"));

        Assert.Null(await service.GetForecastAsync("Ampara", CancellationToken.None));
    }

    private sealed class FakeHandler : HttpMessageHandler
    {
        private readonly Func<HttpResponseMessage> _respond;

        public FakeHandler(Func<HttpResponseMessage> respond) => _respond = respond;

        public List<Uri> Requests { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            return Task.FromResult(_respond());
        }
    }
}
