using System.Net;
using System.Text;
using AgriLink.API.Services.Agents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AgriLink.API.Tests.Agents;

public class WeatherAgentTests
{
    private const string BaseUrl = "https://weather.test/v1/forecast";

    // 10.0 + 20.5 + 0 + 5.5 + 30.4 + 12.0 + 50.0 + 0.0 = 128.4mm
    // (32.2 + 31.0 + 24.0 + 24.0) / 4 = 27.8°C
    private const string SuccessJson = """
        {
          "daily": {
            "time": ["2026-09-01","2026-09-02","2026-09-03","2026-09-04","2026-09-05","2026-09-06","2026-09-07","2026-09-08"],
            "precipitation_sum": [10.0, 20.5, 0, 5.5, 30.4, 12.0, 50.0, 0.0],
            "temperature_2m_max": [32.2, 31.0],
            "temperature_2m_min": [24.0, 24.0]
          }
        }
        """;

    private static AgentContext ContextFor(string district) => new()
    {
        CropId = 1,
        CropType = "Rice",
        IssueTitle = "Wilting after heavy rain",
        District = district,
    };

    private static WeatherAgent CreateAgent(FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new WeatherOptions { BaseUrl = BaseUrl, TimeoutSeconds = 8 });
        return new WeatherAgent(httpClient, options, Mock.Of<ILogger<WeatherAgent>>());
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body) => new(status)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json"),
    };

    [Fact]
    public async Task GetWeatherFindingsAsync_SuccessfulResponse_AggregatesRainfallAndTemperature()
    {
        var handler = new FakeHttpMessageHandler(_ => Json(HttpStatusCode.OK, SuccessJson));
        var agent = CreateAgent(handler);

        var findings = await agent.GetWeatherFindingsAsync(ContextFor("Kurunegala"), CancellationToken.None);

        Assert.False(findings.IsFallback);
        Assert.Equal(128.4, findings.RecentRainfallMm);
        Assert.Equal(27.8, findings.AvgTemperatureC);
        Assert.Contains("128.4mm", findings.Summary);
        Assert.Contains("27.8", findings.Summary);
    }

    [Fact]
    public async Task GetWeatherFindingsAsync_SuccessfulResponse_RequestsTheDistrictCentroid()
    {
        var handler = new FakeHttpMessageHandler(_ => Json(HttpStatusCode.OK, SuccessJson));
        var agent = CreateAgent(handler);

        await agent.GetWeatherFindingsAsync(ContextFor("Kurunegala"), CancellationToken.None);

        var requested = Assert.Single(handler.Requests);
        Assert.StartsWith(BaseUrl, requested.ToString());
        Assert.Contains("latitude=7.48", requested.Query);
        Assert.Contains("longitude=80.36", requested.Query);
        Assert.Contains("past_days=7", requested.Query);
        Assert.DoesNotContain("Kurunegala", requested.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("kurunegala")]
    [InlineData("  Kurunegala  ")]
    [InlineData("NUWARA  ELIYA")]
    public async Task GetWeatherFindingsAsync_LooselyFormattedDistrict_StillResolves(string district)
    {
        var handler = new FakeHttpMessageHandler(_ => Json(HttpStatusCode.OK, SuccessJson));
        var agent = CreateAgent(handler);

        var findings = await agent.GetWeatherFindingsAsync(ContextFor(district), CancellationToken.None);

        Assert.False(findings.IsFallback);
        Assert.Single(handler.Requests);
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;

        public List<Uri> Requests { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            return Task.FromResult(_responder(request));
        }
    }
}
