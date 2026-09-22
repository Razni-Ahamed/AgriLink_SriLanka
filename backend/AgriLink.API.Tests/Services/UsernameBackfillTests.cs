using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services.Accounts;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriLink.API.Tests.Services;

public class UsernameBackfillTests
{
    private static async Task<ApplicationUser> AddUserAsync(UserManager<ApplicationUser> users, string userName, string fullName, string email)
    {
        var user = new ApplicationUser { UserName = userName, Email = email, FullName = fullName };
        var result = await users.CreateAsync(user, "AgriLink@Test.2026!");
        Assert.True(result.Succeeded, string.Join("; ", result.Errors.Select(e => e.Code)));
        return user;
    }

    [Fact]
    public async Task RunAsync_GivesEmailStyleAccountsAValidUniqueUsername_WithSuffixesOnCollision()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        await AddUserAsync(users, "nimal1@agrilink.lk", "Nimal Perera", "nimal1@agrilink.lk");
        var second = await AddUserAsync(users, "nimal2@agrilink.lk", "Nimal Perera", "nimal2@agrilink.lk");
        await AddUserAsync(users, "nimal3@agrilink.lk", "nimal perera", "nimal3@agrilink.lk");

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);

        var names = await db.Users.OrderBy(u => u.Id).Select(u => u.UserName!).ToListAsync();
        Assert.Equal(new[] { "nimal.perera", "nimal.perera2", "nimal.perera3" }, names);
        Assert.All(names, name => Assert.Equal(UsernameCheck.Valid, UsernamePolicy.Check(name)));

        // NormalizedUserName must follow, or FindByNameAsync and the unique index would still see the email.
        Assert.Equal("NIMAL.PERERA2", (await db.Users.SingleAsync(u => u.Id == second.Id)).NormalizedUserName);
        Assert.NotNull(await users.FindByNameAsync("nimal.perera3"));

        // A generated name is not a user-initiated change, so the first real change stays free.
        Assert.All(await db.Users.ToListAsync(), u => Assert.Null(u.UsernameChangedAt));
    }

    [Fact]
    public async Task RunAsync_DoesNotRotateTheSecurityStamp_SoNobodyIsSignedOut()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        var user = await AddUserAsync(users, "kumari@agrilink.lk", "Kumari Silva", "kumari@agrilink.lk");
        var stampBefore = user.SecurityStamp;

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);

        var reloaded = await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
        Assert.Equal("kumari.silva", reloaded.UserName);
        Assert.Equal(stampBefore, reloaded.SecurityStamp);
    }

    [Fact]
    public async Task RunAsync_SkipsUsersThatAlreadyHaveAProperUsername_AndAvoidsTheirNames()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        var existing = await AddUserAsync(users, "nimal.perera", "Nimal Perera", "a@agrilink.lk");
        var legacy = await AddUserAsync(users, "b@agrilink.lk", "Nimal Perera", "b@agrilink.lk");

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);

        Assert.Equal("nimal.perera", (await db.Users.SingleAsync(u => u.Id == existing.Id)).UserName);
        Assert.Equal("nimal.perera2", (await db.Users.SingleAsync(u => u.Id == legacy.Id)).UserName);
    }

    [Fact]
    public async Task RunAsync_Twice_ChangesNothingTheSecondTime()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        await AddUserAsync(users, "a@agrilink.lk", "Nimal Perera", "a@agrilink.lk");
        await AddUserAsync(users, "b@agrilink.lk", "Kumari Silva", "b@agrilink.lk");

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);
        var afterFirst = await db.Users.AsNoTracking().OrderBy(u => u.Id)
            .Select(u => new { u.UserName, u.NormalizedUserName, u.ConcurrencyStamp }).ToListAsync();

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);
        var afterSecond = await db.Users.AsNoTracking().OrderBy(u => u.Id)
            .Select(u => new { u.UserName, u.NormalizedUserName, u.ConcurrencyStamp }).ToListAsync();

        Assert.Equal(afterFirst, afterSecond);
    }

    [Fact]
    public async Task RunAsync_NameWithNothingUsable_FallsBackToUserAndId()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        var user = await AddUserAsync(users, "sinhala@agrilink.lk", "නිමල් පෙරේරා", "sinhala@agrilink.lk");

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);

        Assert.Equal($"user{user.Id}", (await db.Users.SingleAsync(u => u.Id == user.Id)).UserName);
    }

    [Fact]
    public async Task RunAsync_ReservedName_GetsASuffixInstead()
    {
        var (db, users, _) = IdentityTestHarness.Create();
        var user = await AddUserAsync(users, "admin@agrilink.lk", "Admin", "admin@agrilink.lk");

        await UsernameBackfill.RunAsync(users, NullLogger.Instance);

        Assert.Equal("admin2", (await db.Users.SingleAsync(u => u.Id == user.Id)).UserName);
    }

    [Fact]
    public async Task GenerateUniqueAsync_ForANewAccount_FallsBackToUserThenSuffixes()
    {
        var (_, users, _) = IdentityTestHarness.Create();
        await AddUserAsync(users, "user", "Someone", "someone@agrilink.lk");

        var generated = await UsernameGenerator.GenerateUniqueAsync(users, "??", userId: null);

        Assert.Equal("user2", generated);
    }
}
