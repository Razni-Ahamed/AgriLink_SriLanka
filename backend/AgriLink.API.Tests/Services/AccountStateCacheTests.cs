using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// The session check caches each account's state; these pin down that a save to the user row
/// (deactivation, password/stamp change) takes effect on the very next request, not after expiry.
/// </summary>
public class AccountStateCacheTests
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly AccountStateCache _cache = new(new MemoryCache(new MemoryCacheOptions()), TimeSpan.FromMinutes(5));

    private AgriLinkDbContext Db(bool withInterceptor = true)
    {
        var builder = new DbContextOptionsBuilder<AgriLinkDbContext>().UseInMemoryDatabase(_dbName);
        if (withInterceptor)
        {
            builder.AddInterceptors(new AccountStateInvalidationInterceptor(_cache));
        }

        return new AgriLinkDbContext(builder.Options);
    }

    private async Task<int> SeedAsync(string stamp = "stamp-1")
    {
        using var db = Db();
        var user = new ApplicationUser
        {
            UserName = "farmer@agrilink.lk",
            Email = "farmer@agrilink.lk",
            FullName = "Farmer One",
            IsActive = true,
            RegistrationStatus = RegistrationStatus.Approved,
            SecurityStamp = stamp,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }

    private async Task<bool> ValidateAsync(int userId, string stamp)
    {
        using var db = Db();
        return await new AccountSessionValidator(db, _cache).IsValidAsync(userId, stamp, CancellationToken.None);
    }

    [Fact]
    public async Task RepeatedChecks_AreServedFromTheCache()
    {
        var userId = await SeedAsync();
        Assert.True(await ValidateAsync(userId, "stamp-1"));

        // A change that bypasses the app (no interceptor) isn't seen until the entry expires,
        // which shows the second check never reached the database.
        using (var raw = Db(withInterceptor: false))
        {
            var user = await raw.Users.SingleAsync(u => u.Id == userId);
            user.IsActive = false;
            await raw.SaveChangesAsync();
        }

        Assert.True(await ValidateAsync(userId, "stamp-1"));
    }

    [Fact]
    public async Task Deactivation_TakesEffectOnTheNextRequest()
    {
        var userId = await SeedAsync();
        Assert.True(await ValidateAsync(userId, "stamp-1"));

        using (var db = Db())
        {
            var user = await db.Users.SingleAsync(u => u.Id == userId);
            user.IsActive = false;
            await db.SaveChangesAsync();
        }

        Assert.False(await ValidateAsync(userId, "stamp-1"));
    }

    [Fact]
    public async Task StampRotation_RejectsTheOldTokenOnTheNextRequest()
    {
        var userId = await SeedAsync("old-stamp");
        Assert.True(await ValidateAsync(userId, "old-stamp"));

        using (var db = Db())
        {
            var user = await db.Users.SingleAsync(u => u.Id == userId);
            user.SecurityStamp = "new-stamp";
            await db.SaveChangesAsync();
        }

        Assert.False(await ValidateAsync(userId, "old-stamp"));
        Assert.True(await ValidateAsync(userId, "new-stamp"));
    }

    [Fact]
    public async Task ALoadThatRacesAnEviction_IsNotCached()
    {
        var stale = new AccountState(true, RegistrationStatus.Approved, "old-stamp");
        var fresh = new AccountState(false, RegistrationStatus.Approved, "new-stamp");

        // The row changes (and is evicted) while this load is still in flight with the old values.
        var first = await _cache.GetOrLoadAsync(7, _ =>
        {
            _cache.Evict(7);
            return Task.FromResult<AccountState?>(stale);
        }, CancellationToken.None);
        Assert.Equal(stale, first);

        var second = await _cache.GetOrLoadAsync(7, _ => Task.FromResult<AccountState?>(fresh), CancellationToken.None);
        Assert.Equal(fresh, second);
    }

    [Fact]
    public async Task UnknownUsers_AreNotCached()
    {
        var calls = 0;
        Task<AccountState?> Load(CancellationToken _)
        {
            calls++;
            return Task.FromResult<AccountState?>(null);
        }

        await _cache.GetOrLoadAsync(42, Load, CancellationToken.None);
        await _cache.GetOrLoadAsync(42, Load, CancellationToken.None);

        Assert.Equal(2, calls);
    }
}
