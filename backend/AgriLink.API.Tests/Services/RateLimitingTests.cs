using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using AgriLink.API.Services.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// Runs the API's real rate-limiter setup in a small in-process server (Kestrel on a free local
/// port), with the same middleware order as Program.cs: forwarded headers, then the caller's
/// identity, then the limiter. "X-Test-User" stands in for a signed-in user's JWT.
/// </summary>
public class RateLimitingTests
{
    private const string TestUserHeader = "X-Test-User";

    private static async Task<(WebApplication App, HttpClient Client)> StartAsync(Dictionary<string, string?> settings)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(settings);
        builder.Services.Configure<ForwardedHeadersOptions>(RateLimitingSetup.ConfigureForwardedHeaders);
        builder.Services.AddAgriLinkRateLimiting(builder.Configuration);

        var app = builder.Build();
        app.UseForwardedHeaders();
        app.Use(async (context, next) =>
        {
            if (context.Request.Headers.TryGetValue(TestUserHeader, out var userId))
            {
                context.User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, userId.ToString())], authenticationType: "Test"));
            }

            await next();
        });
        app.UseRateLimiter();

        app.MapPost("/login", () => "ok").RequireRateLimiting(RateLimitPolicies.Auth);
        app.MapPost("/upload", () => "ok").RequireRateLimiting(RateLimitPolicies.Uploads);
        app.MapPost("/chat", () => "ok").RequireRateLimiting(RateLimitPolicies.Chat);
        app.MapGet("/ping", () => "ok");
        app.MapGet("/health", () => "Healthy");

        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First();
        return (app, new HttpClient { BaseAddress = new Uri(address) });
    }

    private static HttpRequestMessage Request(HttpMethod method, string path, string? forwardedFor = null, string? userId = null)
    {
        var request = new HttpRequestMessage(method, path);
        if (forwardedFor is not null)
        {
            request.Headers.Add("X-Forwarded-For", forwardedFor);
        }

        if (userId is not null)
        {
            request.Headers.Add(TestUserHeader, userId);
        }

        return request;
    }

    private static async Task<HttpStatusCode[]> SendAsync(HttpClient client, int times, Func<HttpRequestMessage> request)
    {
        var codes = new HttpStatusCode[times];
        for (var i = 0; i < times; i++)
        {
            using var response = await client.SendAsync(request());
            codes[i] = response.StatusCode;
        }

        return codes;
    }

    [Fact]
    public async Task Auth_RefusesTheRequestAfterTheLimit_WithAMessageAndRetryAfter()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:AuthPermitLimit"] = "3" });
        await using var _ = app;

        var allowed = await SendAsync(client, 3, () => Request(HttpMethod.Post, "/login", "203.0.113.7"));
        using var refused = await client.SendAsync(Request(HttpMethod.Post, "/login", "203.0.113.7"));

        Assert.All(allowed, code => Assert.Equal(HttpStatusCode.OK, code));
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.True(refused.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        var body = await refused.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.StartsWith("Too many requests.", body!["message"]);
    }

    [Fact]
    public async Task Auth_CountsEachClientAddressSeparately()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:AuthPermitLimit"] = "2" });
        await using var _ = app;

        await SendAsync(client, 2, () => Request(HttpMethod.Post, "/login", "203.0.113.7"));
        using var sameAddress = await client.SendAsync(Request(HttpMethod.Post, "/login", "203.0.113.7"));
        using var otherAddress = await client.SendAsync(Request(HttpMethod.Post, "/login", "198.51.100.20"));

        Assert.Equal(HttpStatusCode.TooManyRequests, sameAddress.StatusCode);
        Assert.Equal(HttpStatusCode.OK, otherAddress.StatusCode);
    }

    [Fact]
    public async Task ForwardedFor_UsesOnlyTheEntryTheProxyAdded_SoAClientCannotPickItsAddress()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:AuthPermitLimit"] = "1" });
        await using var _ = app;

        // The proxy appends the real address (203.0.113.7) after whatever the client claimed.
        using var first = await client.SendAsync(Request(HttpMethod.Post, "/login", "1.1.1.1, 203.0.113.7"));
        using var spoofed = await client.SendAsync(Request(HttpMethod.Post, "/login", "8.8.8.8, 203.0.113.7"));

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, spoofed.StatusCode);
    }

    [Fact]
    public async Task Uploads_CountSignedInUsersPerAccount_NotPerSharedAddress()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:UploadPermitLimit"] = "2" });
        await using var _ = app;

        await SendAsync(client, 2, () => Request(HttpMethod.Post, "/upload", "203.0.113.7", userId: "11"));
        using var sameUser = await client.SendAsync(Request(HttpMethod.Post, "/upload", "203.0.113.7", userId: "11"));
        using var otherUserSameAddress = await client.SendAsync(Request(HttpMethod.Post, "/upload", "203.0.113.7", userId: "12"));

        Assert.Equal(HttpStatusCode.TooManyRequests, sameUser.StatusCode);
        Assert.Equal(HttpStatusCode.OK, otherUserSameAddress.StatusCode);
    }

    [Fact]
    public async Task Chat_HasItsOwnLimit()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:ChatPermitLimit"] = "2" });
        await using var _ = app;

        var codes = await SendAsync(client, 3, () => Request(HttpMethod.Post, "/chat", userId: "11"));
        using var upload = await client.SendAsync(Request(HttpMethod.Post, "/upload", userId: "11"));

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.TooManyRequests], codes);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
    }

    [Fact]
    public async Task GlobalLimit_CoversEveryRequest_ButNeverTheHealthProbe()
    {
        var (app, client) = await StartAsync(new() { ["RateLimiting:GlobalPermitLimit"] = "2" });
        await using var _ = app;

        var codes = await SendAsync(client, 3, () => Request(HttpMethod.Get, "/ping", "203.0.113.7"));
        var health = await SendAsync(client, 5, () => Request(HttpMethod.Get, "/health", "203.0.113.7"));

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.TooManyRequests], codes);
        Assert.All(health, code => Assert.Equal(HttpStatusCode.OK, code));
    }

    [Fact]
    public async Task Disabled_LetsEverythingThrough()
    {
        var (app, client) = await StartAsync(new()
        {
            ["RateLimiting:Enabled"] = "false",
            ["RateLimiting:AuthPermitLimit"] = "1",
            ["RateLimiting:GlobalPermitLimit"] = "1",
        });
        await using var _ = app;

        var codes = await SendAsync(client, 5, () => Request(HttpMethod.Post, "/login", "203.0.113.7"));

        Assert.All(codes, code => Assert.Equal(HttpStatusCode.OK, code));
    }

    [Theory]
    [InlineData(1, "Too many requests. Please wait 1 second and try again.")]
    [InlineData(45, "Too many requests. Please wait 45 seconds and try again.")]
    [InlineData(600, "Too many requests. Please wait 10 minutes and try again.")]
    public void RejectionMessage_SaysHowLongToWait(int seconds, string expected)
    {
        Assert.Equal(expected, RateLimitingSetup.RejectionMessage(seconds));
    }

    [Fact]
    public void CallerKey_IsTheAccountWhenSignedIn_OtherwiseTheAddress()
    {
        var anonymous = new DefaultHttpContext();
        anonymous.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
        var signedIn = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "42")], "Test")),
        };

        Assert.Equal("ip:203.0.113.7", RateLimitingSetup.CallerKey(anonymous));
        Assert.Equal("user:42", RateLimitingSetup.CallerKey(signedIn));
    }
}
