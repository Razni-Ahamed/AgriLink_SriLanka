using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Services;

public class AccountSessionValidatorTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ApplicationUser SeedActiveUser(AgriLinkDbContext db, int userId = 1, string stamp = "stamp-1")
    {
        var user = new ApplicationUser
        {
            Id = userId,
            UserName = "farmer@agrilink.lk",
            Email = "farmer@agrilink.lk",
            FullName = "Farmer One",
            IsActive = true,
            RegistrationStatus = RegistrationStatus.Approved,
            SecurityStamp = stamp,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task IsValidAsync_StampMatchesCurrentStamp_ReturnsTrue()
    {
        using var db = CreateDb();
        var user = SeedActiveUser(db, stamp: "current-stamp");
        var validator = new AccountSessionValidator(db);

        var result = await validator.IsValidAsync(user.Id, "current-stamp", CancellationToken.None);

        Assert.True(result);
    }

    [Fact]
    public async Task IsValidAsync_StampDoesNotMatchCurrentStamp_ReturnsFalse()
    {
        using var db = CreateDb();
        var user = SeedActiveUser(db, stamp: "current-stamp");
        var validator = new AccountSessionValidator(db);

        var result = await validator.IsValidAsync(user.Id, "stale-stamp-from-before-password-change", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task IsValidAsync_TokenHasNoStampClaim_ReturnsFalse()
    {
        using var db = CreateDb();
        var user = SeedActiveUser(db);
        var validator = new AccountSessionValidator(db);

        // Tokens minted before the "stamp" claim existed carry none — treated the same as a
        // mismatch, so those sessions end once at this deploy rather than staying valid forever.
        var result = await validator.IsValidAsync(user.Id, stampClaim: null, CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task IsValidAsync_InactiveUser_ReturnsFalseEvenWithMatchingStamp()
    {
        using var db = CreateDb();
        var user = SeedActiveUser(db, stamp: "current-stamp");
        user.IsActive = false;
        await db.SaveChangesAsync();
        var validator = new AccountSessionValidator(db);

        var result = await validator.IsValidAsync(user.Id, "current-stamp", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task IsValidAsync_PendingRegistration_ReturnsFalse()
    {
        using var db = CreateDb();
        var user = SeedActiveUser(db, stamp: "current-stamp");
        user.RegistrationStatus = RegistrationStatus.Pending;
        await db.SaveChangesAsync();
        var validator = new AccountSessionValidator(db);

        var result = await validator.IsValidAsync(user.Id, "current-stamp", CancellationToken.None);

        Assert.False(result);
    }

    [Fact]
    public async Task IsValidAsync_UnknownUser_ReturnsFalse()
    {
        using var db = CreateDb();
        var validator = new AccountSessionValidator(db);

        var result = await validator.IsValidAsync(999, "any-stamp", CancellationToken.None);

        Assert.False(result);
    }
}
