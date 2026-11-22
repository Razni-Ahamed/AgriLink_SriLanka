using System.Data.Common;
using System.Runtime.CompilerServices;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AgriLink.API.Data;

/// <summary>
/// Keeps <see cref="AccountStateCache"/> honest: whenever a save modifies or deletes a user row
/// (IsActive, RegistrationStatus, SecurityStamp and so on — UserManager saves through this same
/// DbContext), that user's cached state is evicted before the save, again after it, and again
/// when an enclosing transaction commits or rolls back. Evicting at commit matters because a
/// request reading the row between the save and the commit still sees the old values.
/// </summary>
public sealed class AccountStateInvalidationInterceptor : ISaveChangesInterceptor, IDbTransactionInterceptor
{
    private readonly AccountStateCache _cache;
    private readonly ConditionalWeakTable<DbContext, HashSet<int>> _pending = new();

    public AccountStateInvalidationInterceptor(AccountStateCache cache)
    {
        _cache = cache;
    }

    public InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Capture(eventData.Context);
        return result;
    }

    public ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Capture(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        AfterSave(eventData.Context);
        return result;
    }

    public ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        AfterSave(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public void SaveChangesFailed(DbContextErrorEventData eventData) => AfterSave(eventData.Context);

    public Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        AfterSave(eventData.Context);
        return Task.CompletedTask;
    }

    public void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData) => Flush(eventData.Context);

    public Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        Flush(eventData.Context);
        return Task.CompletedTask;
    }

    public void TransactionRolledBack(DbTransaction transaction, TransactionEndEventData eventData) => Flush(eventData.Context);

    public Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        Flush(eventData.Context);
        return Task.CompletedTask;
    }

    private void Capture(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        foreach (var entry in context.ChangeTracker.Entries<ApplicationUser>())
        {
            if (entry.State is EntityState.Modified or EntityState.Deleted)
            {
                var userId = entry.Entity.Id;
                _cache.Evict(userId);
                lock (_pending)
                {
                    _pending.GetOrCreateValue(context).Add(userId);
                }
            }
        }
    }

    private void AfterSave(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        EvictPending(context, clear: context.Database.CurrentTransaction is null);
    }

    private void Flush(DbContext? context)
    {
        if (context is not null)
        {
            EvictPending(context, clear: true);
        }
    }

    private void EvictPending(DbContext context, bool clear)
    {
        int[] userIds;
        lock (_pending)
        {
            if (!_pending.TryGetValue(context, out var pending) || pending.Count == 0)
            {
                return;
            }

            userIds = pending.ToArray();
            if (clear)
            {
                pending.Clear();
            }
        }

        foreach (var userId in userIds)
        {
            _cache.Evict(userId);
        }
    }
}
