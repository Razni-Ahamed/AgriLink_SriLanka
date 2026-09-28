using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Tests.TestSupport;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriLink.API.Tests.Services;

public class AdminSeederTests
{
    private static readonly AdminSeedOptions Seed = new()
    {
        Email = "admin@agrilink.lk",
        Password = "Admin@AgriLink.2026!",
        FullName = "AgriLink Administrator",
    };

    [Fact]
    public async Task Seed_WithNoAdmin_CreatesOne()
    {
        var (_, users, roles) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roles);

        await AdminSeeder.SeedAsync(users, Seed, NullLogger.Instance);

        var admins = await users.GetUsersInRoleAsync(AdminSeeder.AdminRole);
        Assert.Equal("admin@agrilink.lk", Assert.Single(admins).Email);
    }

    [Fact]
    public async Task Seed_AfterTheAdminChangedTheirEmail_DoesNotCreateASecondAdmin()
    {
        var (_, users, roles) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roles);
        await AdminSeeder.SeedAsync(users, Seed, NullLogger.Instance);
        var admin = Assert.Single(await users.GetUsersInRoleAsync(AdminSeeder.AdminRole));
        await users.SetEmailAsync(admin, "new.admin@agrilink.lk");

        await AdminSeeder.SeedAsync(users, Seed, NullLogger.Instance);

        Assert.Single(await users.GetUsersInRoleAsync(AdminSeeder.AdminRole));
        Assert.Null(await users.FindByEmailAsync("admin@agrilink.lk"));
    }

    [Fact]
    public async Task Seed_NeverPromotesAnAccountThatAlreadyHasARole()
    {
        var (_, users, roles) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roles);
        var farmer = new ApplicationUser { UserName = "farmer.one", Email = "admin@agrilink.lk", FullName = "Farmer One" };
        await users.CreateAsync(farmer, "Farmer@AgriLink.2026!");
        await users.AddToRoleAsync(farmer, "Farmer");

        await AdminSeeder.SeedAsync(users, Seed, NullLogger.Instance);

        Assert.Empty(await users.GetUsersInRoleAsync(AdminSeeder.AdminRole));
        Assert.Equal(new[] { "Farmer" }, await users.GetRolesAsync(farmer));
    }
}
