using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// Guards model settings the InMemory provider can't exercise: it ignores both concurrency tokens
/// and unique indexes, so these only take effect on Postgres.
/// </summary>
public class AgriLinkDbContextModelTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(typeof(HarvestListing))]
    [InlineData(typeof(PurchaseRequest))]
    [InlineData(typeof(Order))]
    public void RowsChangedByCompetingRequests_CarryAConcurrencyToken(Type entity)
    {
        using var db = CreateDb();

        var version = db.Model.FindEntityType(entity)!.FindProperty("Version")!;

        Assert.True(version.IsConcurrencyToken);
    }

    [Fact]
    public void Email_IsUniqueInTheDatabase()
    {
        using var db = CreateDb();

        var index = db.Model.FindEntityType(typeof(ApplicationUser))!.GetIndexes()
            .Single(i => i.Properties.Single().Name == nameof(ApplicationUser.NormalizedEmail));

        Assert.True(index.IsUnique);
    }
}
