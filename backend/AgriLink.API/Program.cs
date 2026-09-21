using System.Text;
using System.Text.Json.Serialization;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

// ----- Database -----
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");

builder.Services.AddDbContext<AgriLinkDbContext>(options => options.UseNpgsql(connectionString));

// ----- Identity -----
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 12;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireDigit = true;
        options.User.RequireUniqueEmail = true;
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
        // only took effect at their next login. Re-check the account on every request instead.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdValue = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var db = context.HttpContext.RequestServices.GetRequiredService<AgriLinkDbContext>();
                var isUsable = int.TryParse(userIdValue, out var userId)
                    && await db.Users.AsNoTracking().AnyAsync(u =>
                        u.Id == userId && u.IsActive && u.RegistrationStatus == RegistrationStatus.Approved);
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
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

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

builder.Services.AddScoped<IPlannerAgent, PlannerAgent>();
builder.Services.AddScoped<ICropAnalysisAgent, CropAnalysisAgent>();
builder.Services.AddScoped<IValidationAgent, ValidationAgent>();
builder.Services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();

builder.Services.AddHttpClient<IWeatherAgent, WeatherAgent>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<WeatherOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
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

// ----- Apply migrations, then seed roles and the bootstrap admin on startup -----
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AgriLinkDbContext>().Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
    await RoleSeeder.SeedAsync(roleManager);

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var adminSeed = scope.ServiceProvider.GetRequiredService<IOptions<AdminSeedOptions>>().Value;
    var seedLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminSeeder");
    await AdminSeeder.SeedAsync(userManager, adminSeed, seedLogger);
}

// Load the photo models now rather than on the first farmer's upload, so a missing or invalid
// model shows up in the startup log.
app.Services.GetRequiredService<IImageClassifier>();

// ----- Middleware pipeline -----
// Swagger is on in development, and on a host when Swagger__Enabled=true (handy for a demo).
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
