using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace AgriLink.API.Tests.Integration;

/// <summary>
/// The deploy-time database work ("--migrate", or start-up when Database:MigrateOnStartup is true)
/// against a brand-new PostgreSQL database: it must migrate and seed an empty database, and running
/// it again (every deploy or restart) must change nothing.
/// </summary>
public class StartupDatabaseTasksTests
{
    private static ServiceProvider BuildServices(string connectionString)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AdminSeed:Email"] = "admin@agrilink.test",
                ["AdminSeed:Password"] = "Admin-Pass-1234!",
                ["AdminSeed:FullName"] = "Test Admin",
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection();
        services.AddDbContext<AgriLinkDbContext>(options => options.UseNpgsql(connectionString));
        services.Configure<AdminSeedOptions>(configuration.GetSection(AdminSeedOptions.SectionName));
        services.AddIdentityCore<ApplicationUser>(options => options.User.RequireUniqueEmail = true)
            .AddRoles<IdentityRole<int>>()
            .AddEntityFrameworkStores<AgriLinkDbContext>()
            .AddDefaultTokenProviders();
        return services.BuildServiceProvider();
    }

    [SkippableFact]
    public async Task RunAsync_MigratesAndSeedsAnEmptyDatabase_AndIsIdempotent()
    {
        var server = Environment.GetEnvironmentVariable(PostgresDatabase.Variable);
        Skip.If(string.IsNullOrWhiteSpace(server), $"Set {PostgresDatabase.Variable} to run the PostgreSQL integration tests.");

        var connectionString = new NpgsqlConnectionStringBuilder(server)
        {
            Database = $"agrilink_it_{Guid.NewGuid():N}",
        }.ConnectionString;

        await using var services = BuildServices(connectionString);
        try
        {
            await StartupDatabaseTasks.RunAsync(services);
            await StartupDatabaseTasks.RunAsync(services);

            using var scope = services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AgriLinkDbContext>();
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());

            var roles = await db.Roles.Select(r => r.Name).ToListAsync();
            Assert.Equal(RoleSeeder.Roles.OrderBy(r => r), roles.OrderBy(r => r));

            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var admin = Assert.Single(await users.GetUsersInRoleAsync(AdminSeeder.AdminRole));
            Assert.Equal("admin@agrilink.test", admin.Email);
        }
        finally
        {
            using var scope = services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<AgriLinkDbContext>().Database.EnsureDeletedAsync();
        }
    }
}
