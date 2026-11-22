using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Data;

/// <summary>
/// The one-off database work a deployment needs: apply pending EF Core migrations, run the username
/// backfill, and seed the roles and the bootstrap admin. Every step is idempotent.
/// <para>
/// By default the API runs this at start-up (<c>Database:MigrateOnStartup</c>, default true), which
/// suits a new environment and local development. On a host where cold starts matter, set it to
/// false and run it once per deployment instead with <c>dotnet AgriLink.API.dll --migrate</c>
/// (deploy/publish-backend.ps1 does this when the App Service setting is false).
/// </para>
/// </summary>
public static class StartupDatabaseTasks
{
    public const string MigrateOnStartupKey = "Database:MigrateOnStartup";
    public const string MigrateOnlyArgument = "--migrate";

    public static async Task RunAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var loggerFactory = provider.GetRequiredService<ILoggerFactory>();
        var logger = loggerFactory.CreateLogger(typeof(StartupDatabaseTasks).FullName!);

        var db = provider.GetRequiredService<AgriLinkDbContext>();
        var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        if (pending.Count > 0)
        {
            logger.LogInformation("Applying {Count} pending migration(s): {Migrations}", pending.Count, string.Join(", ", pending));
            await db.Database.MigrateAsync(cancellationToken);
        }

        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        await UsernameBackfill.RunAsync(userManager, loggerFactory.CreateLogger("UsernameBackfill"), cancellationToken);

        await RoleSeeder.SeedAsync(provider.GetRequiredService<RoleManager<IdentityRole<int>>>());

        var adminSeed = provider.GetRequiredService<IOptions<AdminSeedOptions>>().Value;
        await AdminSeeder.SeedAsync(userManager, adminSeed, loggerFactory.CreateLogger("AdminSeeder"));
    }
}
