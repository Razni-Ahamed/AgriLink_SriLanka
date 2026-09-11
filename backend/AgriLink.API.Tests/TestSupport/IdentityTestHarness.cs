using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriLink.API.Tests.TestSupport;

/// <summary>
/// Builds a real UserManager/RoleManager pair backed by an EF Core InMemory AgriLinkDbContext.
/// AdminController drives Identity directly (create user, add/remove role, activate/deactivate),
/// so mocking UserManager would just re-implement Identity badly — wiring the real stores against
/// an in-memory database exercises the same code path Program.cs configures at startup.
/// </summary>
public static class IdentityTestHarness
{
    public static (AgriLinkDbContext Db, UserManager<ApplicationUser> Users, RoleManager<IdentityRole<int>> Roles) Create(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;
        var db = new AgriLinkDbContext(options);

        var userStore = new UserStore<ApplicationUser, IdentityRole<int>, AgriLinkDbContext, int>(db);
        var userManager = new UserManager<ApplicationUser>(
            userStore,
            optionsAccessor: null!,
            new PasswordHasher<ApplicationUser>(),
            new List<IUserValidator<ApplicationUser>> { new UserValidator<ApplicationUser>() },
            new List<IPasswordValidator<ApplicationUser>> { new PasswordValidator<ApplicationUser>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            services: null!,
            new NullLogger<UserManager<ApplicationUser>>());

        var roleStore = new RoleStore<IdentityRole<int>, AgriLinkDbContext, int>(db);
        var roleManager = new RoleManager<IdentityRole<int>>(
            roleStore,
            new List<IRoleValidator<IdentityRole<int>>> { new RoleValidator<IdentityRole<int>>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            new NullLogger<RoleManager<IdentityRole<int>>>());

        return (db, userManager, roleManager);
    }

    public static async Task SeedRolesAsync(RoleManager<IdentityRole<int>> roleManager)
    {
        foreach (var role in RoleSeeder.Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(role));
            }
        }
    }
}
