using System.Collections.Concurrent;
using AgriLink.API.Models;
using Microsoft.Extensions.Caching.Memory;

namespace AgriLink.API.Services;

/// <summary>The account fields the per-request session check compares a token against.</summary>
public sealed record AccountState(bool IsActive, RegistrationStatus RegistrationStatus, string? SecurityStamp);

/// <summary>
/// A short-lived, in-process copy of each account's <see cref="AccountState"/>, so the session
/// check in Program.cs (OnTokenValidated) stops costing a database round-trip on every
/// authenticated request — the polling screens (notifications, chat) alone made that several
/// queries a minute per signed-in user.
///
/// Correctness does not rest on the expiry: <see cref="Data.AccountStateInvalidationInterceptor"/>
/// evicts a user's entry whenever their row is saved (deactivation, approval, password change,
/// role change — anything that rotates SecurityStamp), so the next request re-reads the database.
/// A per-user generation counter stops a request that read the old row just before such a save
/// from writing that stale copy back after the eviction. The expiry only bounds what an eviction
/// can't reach, such as a second app instance (the API runs as one) or a change made directly in
/// the database.
/// </summary>
public sealed class AccountStateCache
{
    public static readonly TimeSpan DefaultLifetime = TimeSpan.FromSeconds(30);

    private readonly IMemoryCache _cache;
    private readonly TimeSpan _lifetime;
    private readonly ConcurrentDictionary<int, long> _generations = new();

    public AccountStateCache(IMemoryCache cache) : this(cache, DefaultLifetime)
    {
    }

    public AccountStateCache(IMemoryCache cache, TimeSpan lifetime)
    {
        _cache = cache;
        _lifetime = lifetime;
    }

    private static string Key(int userId) => $"account-state:{userId}";

    /// <summary>Returns the cached state, or loads it and caches it unless the user's row changed meanwhile.</summary>
    public async Task<AccountState?> GetOrLoadAsync(int userId, Func<CancellationToken, Task<AccountState?>> load, CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(Key(userId), out AccountState? cached))
        {
            return cached;
        }

        var generationBeforeLoad = _generations.GetValueOrDefault(userId);
        var state = await load(cancellationToken);

        // Unknown users aren't cached: there's nothing to protect, and caching them would only
        // let an id that is created moments later look missing.
        if (state is not null && _generations.GetValueOrDefault(userId) == generationBeforeLoad)
        {
            _cache.Set(Key(userId), state, _lifetime);
        }

        return state;
    }

    /// <summary>Forgets a user's cached state, so the next request reads it from the database.</summary>
    public void Evict(int userId)
    {
        _generations.AddOrUpdate(userId, 1, (_, generation) => generation + 1);
        _cache.Remove(Key(userId));
    }
}
