using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;

namespace AgriLink.API.Services.RateLimiting;

/// <summary>
/// The API's request limits (ASP.NET Core's built-in rate limiter). A global limit covers every
/// request; controllers opt their sensitive actions into a stricter named policy with
/// <c>[EnableRateLimiting(RateLimitPolicies.Auth)]</c> and so on. A refused request gets a 429
/// with a <c>Retry-After</c> header and the same <c>{ message }</c> body as the API's other errors,
/// so both apps show the text without any change.
/// </summary>
public static class RateLimitingSetup
{
    public static IServiceCollection AddAgriLinkRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(RateLimitingOptions.SectionName).Get<RateLimitingOptions>()
            ?? new RateLimitingOptions();

        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.OnRejected = WriteRejectionAsync;

            // The named policies are registered even when limiting is off: an [EnableRateLimiting]
            // attribute naming a policy that doesn't exist fails the request.
            limiter.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                options.Enabled && !IsHealthCheck(context)
                    ? FixedWindow(CallerKey(context), options.GlobalPermitLimit, options.GlobalWindowSeconds)
                    : RateLimitPartition.GetNoLimiter("unlimited"));

            limiter.AddPolicy(RateLimitPolicies.Auth, context =>
                options.Enabled
                    ? FixedWindow("ip:" + ClientIp(context), options.AuthPermitLimit, options.AuthWindowSeconds)
                    : RateLimitPartition.GetNoLimiter("unlimited"));

            limiter.AddPolicy(RateLimitPolicies.Uploads, context =>
                options.Enabled
                    ? FixedWindow(CallerKey(context), options.UploadPermitLimit, options.UploadWindowSeconds)
                    : RateLimitPartition.GetNoLimiter("unlimited"));

            limiter.AddPolicy(RateLimitPolicies.Chat, context =>
                options.Enabled
                    ? FixedWindow(CallerKey(context), options.ChatPermitLimit, options.ChatWindowSeconds)
                    : RateLimitPartition.GetNoLimiter("unlimited"));
        });

        return services;
    }

    /// <summary>
    /// Reads the client address from X-Forwarded-For. Only the last entry is used: that is the one
    /// the host's own proxy appended, so a client can't pick its own address by sending the header.
    /// </summary>
    public static void ConfigureForwardedHeaders(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
        options.ForwardLimit = 1;
        // Azure's front end has no fixed address to list, so any sender is trusted for that one entry.
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    }

    /// <summary>
    /// The account id for a signed-in caller, otherwise the IP address. Counting accounts rather than
    /// addresses means farmers who share one mobile-network address don't use up each other's limit.
    /// </summary>
    public static string CallerKey(HttpContext context)
    {
        var userId = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            : null;
        return userId is not null ? "user:" + userId : "ip:" + ClientIp(context);
    }

    /// <summary>On Azure this is the real client address only because the forwarded-headers
    /// middleware runs first (see Program.cs); without it every caller would share the proxy's.</summary>
    public static string ClientIp(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    // The host's health probe must never be refused, or a busy minute would mark the app as down.
    private static bool IsHealthCheck(HttpContext context) =>
        context.Request.Path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase);

    private static RateLimitPartition<string> FixedWindow(string key, int permitLimit, int windowSeconds) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = Math.Max(1, permitLimit),
            Window = TimeSpan.FromSeconds(Math.Max(1, windowSeconds)),
            QueueLimit = 0, // refuse at once rather than hold the request open
        });

    private static async ValueTask WriteRejectionAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        var response = rejected.HttpContext.Response;
        var waitSeconds = 60;
        if (rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            waitSeconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            response.Headers.RetryAfter = waitSeconds.ToString(CultureInfo.InvariantCulture);
        }

        response.StatusCode = StatusCodes.Status429TooManyRequests;
        await response.WriteAsJsonAsync(new { message = RejectionMessage(waitSeconds) }, cancellationToken);
    }

    public static string RejectionMessage(int waitSeconds)
    {
        var wait = waitSeconds <= 90
            ? $"{waitSeconds} second{(waitSeconds == 1 ? string.Empty : "s")}"
            : $"{(int)Math.Ceiling(waitSeconds / 60.0)} minutes";
        return $"Too many requests. Please wait {wait} and try again.";
    }
}

/// <summary>The named limits a controller action can opt into.</summary>
public static class RateLimitPolicies
{
    public const string Auth = "auth";
    public const string Uploads = "uploads";
    public const string Chat = "chat";
}
