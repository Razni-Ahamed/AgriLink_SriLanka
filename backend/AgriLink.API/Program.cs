using System.Text;
using System.Text.Json.Serialization;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Sms;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;
using AgriLink.API.Services.Agents.Llm;
using AgriLink.API.Services.Images;
using AgriLink.API.Services.RateLimiting;
using AgriLink.API.Services.Weather;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// "--migrate" runs the deployment's database work (StartupDatabaseTasks) and exits without serving.
// It is removed before configuration reads the arguments, which expects "--key value" pairs.
var migrateOnly = args.Contains(StartupDatabaseTasks.MigrateOnlyArgument, StringComparer.OrdinalIgnoreCase);
args = args.Where(a => !string.Equals(a, StartupDatabaseTasks.MigrateOnlyArgument, StringComparison.OrdinalIgnoreCase)).ToArray();

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

// ----- Database -----
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");

// The per-request account check (see OnTokenValidated below) reads through AccountStateCache;
// the interceptor evicts a user's cached state whenever their row is saved.
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<AccountStateCache>();
builder.Services.AddSingleton<AccountStateInvalidationInterceptor>();
builder.Services.AddDbContext<AgriLinkDbContext>((sp, options) => options
    .UseNpgsql(connectionString)
    .AddInterceptors(sp.GetRequiredService<AccountStateInvalidationInterceptor>()));

// ----- Identity -----
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 12;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.User.RequireUniqueEmail = true;

        // Login used to allow unlimited guesses. After 5 wrong passwords in a row the account is
        // locked for 15 minutes (AuthController); an admin password reset also unlocks it.
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole<int>>()
    .AddEntityFrameworkStores<AgriLinkDbContext>()
    .AddDefaultTokenProviders();

// ----- JWT Authentication -----
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier,
        };

        // A token outlives the account state it was issued for (8 hours), so deactivating a user
        // only took effect at their next login. Re-check the account — and, since a password
        // change rotates SecurityStamp, the token's own "stamp" claim — on every request instead.
        // The account's state is cached for a few seconds (AccountStateCache) and evicted the
        // moment the user row is saved, so this stays as strict without a query per request.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdValue = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var stampClaim = context.Principal?.FindFirst("stamp")?.Value;
                var validator = context.HttpContext.RequestServices.GetRequiredService<IAccountSessionValidator>();
                var isUsable = int.TryParse(userIdValue, out var userId)
                    && await validator.IsValidAsync(userId, stampClaim, context.HttpContext.RequestAborted);
                if (!isUsable)
                {
                    context.Fail("This account is no longer active.");
                }
            },
        };
    });

builder.Services.AddAuthorization();

// ----- App services -----
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// ----- SMS alerts (optional) -----
// Off unless Sms:Provider is "NotifyLk" and its user id, API key and sender id are set.
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection(SmsOptions.SectionName));
var smsOptions = builder.Configuration.GetSection(SmsOptions.SectionName).Get<SmsOptions>() ?? new SmsOptions();
if (smsOptions.IsEnabled)
{
    builder.Services.AddHttpClient<ISmsSender, NotifyLkSmsSender>(NotifyLkSmsSender.HttpClientName, client =>
        client.Timeout = TimeSpan.FromSeconds(smsOptions.TimeoutSeconds));
    // The API key travels in the query string, so keep HttpClient from logging request URLs.
    builder.Logging.AddFilter($"System.Net.Http.HttpClient.{NotifyLkSmsSender.HttpClientName}", LogLevel.Warning);
}
else
{
    builder.Services.AddSingleton<ISmsSender, NullSmsSender>();
}
builder.Services.AddSingleton<SmsSendLimiter>();
builder.Services.AddSingleton<SmsAlertQueue>();
builder.Services.AddSingleton<ISmsAlertQueue>(sp => sp.GetRequiredService<SmsAlertQueue>());
builder.Services.AddHostedService<SmsAlertDispatcher>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAccountSessionValidator, AccountSessionValidator>();

builder.Services.Configure<WeatherOptions>(builder.Configuration.GetSection("Weather"));
builder.Services.Configure<AdminSeedOptions>(builder.Configuration.GetSection(AdminSeedOptions.SectionName));

// ----- Photo classification -----
builder.Services.Configure<ImageClassificationOptions>(builder.Configuration.GetSection(ImageClassificationOptions.SectionName));
builder.Services.AddSingleton<IDiseaseKnowledgeBase, DiseaseKnowledgeBase>();
builder.Services.AddSingleton<IImageClassifier>(sp =>
{
    var options = sp.GetRequiredService<IOptions<ImageClassificationOptions>>().Value;
    var env = sp.GetRequiredService<IWebHostEnvironment>();
    return new OnnxImageClassifier(
        Path.GetFullPath(Path.Combine(env.ContentRootPath, options.ModelsDirectory)),
        options.IntraOpThreads,
        TimeSpan.FromSeconds(options.TimeoutSeconds),
        sp.GetRequiredService<ILogger<OnnxImageClassifier>>());
});
builder.Services.AddHostedService<ImageClassifierWarmup>();

builder.Services.AddScoped<IPlannerAgent, PlannerAgent>();
builder.Services.AddScoped<ICropAnalysisAgent, CropAnalysisAgent>();
builder.Services.AddScoped<IValidationAgent, ValidationAgent>();
builder.Services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();

builder.Services.AddHttpClient<IWeatherAgent, WeatherAgent>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<WeatherOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});

// The farmer's home-page forecast: the same provider and settings, cached per district
// (in the IMemoryCache registered with the database above).
builder.Services.AddHttpClient<IForecastService, ForecastService>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<WeatherOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});

// ----- Language model for the Planner agent (optional) -----
// Off unless Llm:Enabled is set. The team's Qwen runs in LM Studio on a laptop, reached through an
// ngrok tunnel that requires Llm:ApiKey; whenever it is off or unreachable the rules plan instead.
builder.Services.Configure<LlmOptions>(builder.Configuration.GetSection(LlmOptions.SectionName));
builder.Services.AddHttpClient<ILlmClient, OpenAiCompatibleLlmClient>((sp, client) =>
{
    // The planner's own per-attempt timeout (Llm:TimeoutSeconds) is the one that normally fires.
    var options = sp.GetRequiredService<IOptions<LlmOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds + 5);
});

// ----- Issue photos -----
builder.Services.AddSingleton<IIssuePhotoProcessor, IssuePhotoProcessor>();

// Cloudinary when its credentials are configured (user-secrets locally, environment variables on a
// host); otherwise a local folder, which is only suitable for development.
var cloudinaryOptions = builder.Configuration.GetSection(CloudinaryOptions.SectionName).Get<CloudinaryOptions>()
    ?? new CloudinaryOptions();
if (cloudinaryOptions.IsConfigured)
{
    builder.Services.AddSingleton<IImageStorageService>(new CloudinaryImageStorageService(cloudinaryOptions));
}
else
{
    builder.Services.AddSingleton<IImageStorageService>(sp =>
    {
        var env = sp.GetRequiredService<IWebHostEnvironment>();
        var configuredRoot = builder.Configuration.GetSection(ImageStorageOptions.SectionName)
            .Get<ImageStorageOptions>()?.LocalRoot;
        var root = Path.Combine(env.ContentRootPath, configuredRoot ?? Path.Combine("App_Data", "issue-images"));

        var logger = sp.GetRequiredService<ILogger<LocalImageStorageService>>();
        if (!env.IsDevelopment())
        {
            logger.LogWarning(
                "Cloudinary is not configured; issue photos are being stored on local disk at {Root}, which is not durable outside development.",
                root);
        }

        return new LocalImageStorageService(root);
    });
}

// ----- Profile photos -----
// Chosen the same way as issue photos above, but stored publicly: see CloudinaryProfilePhotoStorage.
builder.Services.AddSingleton<IProfilePhotoProcessor, ProfilePhotoProcessor>();
builder.Services.AddHttpContextAccessor();
if (cloudinaryOptions.IsConfigured)
{
    builder.Services.AddSingleton<IProfilePhotoStorage>(new CloudinaryProfilePhotoStorage(cloudinaryOptions));
}
else
{
    builder.Services.AddSingleton<IProfilePhotoStorage>(sp =>
    {
        var env = sp.GetRequiredService<IWebHostEnvironment>();
        var root = Path.Combine(env.ContentRootPath, "App_Data", "avatars");
        if (!env.IsDevelopment())
        {
            sp.GetRequiredService<ILogger<LocalProfilePhotoStorage>>().LogWarning(
                "Cloudinary is not configured; profile photos are being stored on local disk at {Root}, which is not durable outside development.",
                root);
        }

        return new LocalProfilePhotoStorage(root, sp.GetRequiredService<IHttpContextAccessor>());
    });
}

// ----- CORS -----
// Cors:AllowedOrigins is a comma-separated list (env var Cors__AllowedOrigins on a host); with none
// configured, only the local dev servers are allowed.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(origin => origin.TrimEnd('/'))
    .ToArray();
if (allowedOrigins.Length == 0)
{
    allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ----- Error handling and health -----
// Any exception a controller doesn't handle becomes an RFC 7807 problem+json 500 (with no stack
// trace or exception detail) instead of an empty response, so both apps get a consistent body.
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");

// ----- Client address and rate limits -----
// On Azure App Service every request arrives from the platform's front end, which adds the real
// client address as the last entry of X-Forwarded-For. Reading only that last entry
// (ForwardLimit = 1) gives the per-address limits the real caller, and a client can't spoof it by
// sending its own header. ForwardedHeaders__Enabled=false turns it off for a host without a proxy.
var useForwardedHeaders = builder.Configuration.GetValue("ForwardedHeaders:Enabled", true);
builder.Services.Configure<ForwardedHeadersOptions>(RateLimitingSetup.ConfigureForwardedHeaders);
builder.Services.AddAgriLinkRateLimiting(builder.Configuration);

// ----- Response compression -----
// JSON lists (marketplace, issue queues, chat, notifications) went out uncompressed. Brotli/gzip
// at the fastest level: most of the size win for little CPU on the App Service F1 quota.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

// ----- Controllers & Swagger -----
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "AgriLink API", Version = "v1" });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT with the 'Bearer ' prefix, e.g. \"Bearer eyJhbGci...\"",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    options.AddSecurityDefinition("Bearer", securityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { { securityScheme, Array.Empty<string>() } });
});

var app = builder.Build();

// ----- Migrations and seeding -----
// Migrations, the username backfill and role/admin seeding (StartupDatabaseTasks) used to run on
// every start, in front of the first request after a cold start. Database:MigrateOnStartup (default
// true) keeps that for new environments and local development; a host that sets it to false runs
// the same work at deploy time with "--migrate" instead (see docs/deployment/cold-starts.md).
if (migrateOnly)
{
    await StartupDatabaseTasks.RunAsync(app.Services);
    app.Logger.LogInformation("Database migrations and seeding finished (--migrate); exiting.");
    return;
}

if (app.Configuration.GetValue(StartupDatabaseTasks.MigrateOnStartupKey, true))
{
    await StartupDatabaseTasks.RunAsync(app.Services);
}
else
{
    app.Logger.LogInformation("Skipping migrations and seeding at start-up ({Key} is false); run the API with --migrate at deploy time.", StartupDatabaseTasks.MigrateOnStartupKey);
}

// The photo models load in the background once the API is listening (ImageClassifierWarmup), so
// they no longer delay the first request after a cold start.

var llmOptions = app.Services.GetRequiredService<IOptions<LlmOptions>>().Value;
app.Logger.LogInformation(
    llmOptions.Enabled ? "Planner: language model {Model} at {Host}, rules as fallback." : "Planner: rules only (Llm:Enabled is off).",
    llmOptions.Model,
    Uri.TryCreate(llmOptions.BaseUrl, UriKind.Absolute, out var llmUri) ? llmUri.Host : "(invalid Llm:BaseUrl)");

// ----- Middleware pipeline -----
if (useForwardedHeaders)
{
    app.UseForwardedHeaders();
}

app.UseExceptionHandler();

// Reads only. The responses that hand out a token (login, password change) are all writes, and a
// token next to text the caller sent is the mix compression side channels (BREACH) need; write
// responses are small anyway. The big payloads — lists, queues, chat — are all GETs.
app.UseWhen(
    context => HttpMethods.IsGet(context.Request.Method),
    branch => branch.UseResponseCompression());

// Swagger is on in development, and on a host when Swagger__Enabled=true (handy for a demo).
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
// After CORS, so a refused request still carries the CORS headers and the website can read the
// 429 message; after authentication, so signed-in callers are counted per account.
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

// Public liveness/readiness probe for the host and evaluators: 200 "Healthy" or 503 "Unhealthy".
app.MapHealthChecks("/health");

// Liveness only: answers without touching the database. Point keep-warm pings here, so they keep
// the App Service instance loaded without also keeping the (separately billed) database awake.
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false,
});

app.Run();
