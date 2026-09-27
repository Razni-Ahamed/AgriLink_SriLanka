using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace AgriLink.API.Data;

public static class DatabaseTransactions
{
    /// <summary>
    /// Starts a transaction, so work that spans several saves — Identity's UserManager saves on
    /// every call — either all lands or none of it does. Returns null on the EF InMemory provider
    /// the unit tests use, which has no transactions; callers treat null as "nothing to commit".
    /// </summary>
    public static async Task<IDbContextTransaction?> BeginIfSupportedAsync(
        this DatabaseFacade database, CancellationToken cancellationToken = default) =>
        database.IsRelational() ? await database.BeginTransactionAsync(cancellationToken) : null;
}
