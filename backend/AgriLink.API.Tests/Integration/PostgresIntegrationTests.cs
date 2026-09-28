using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace AgriLink.API.Tests.Integration;

/// <summary>
/// Creates a throwaway PostgreSQL database for the class, migrated with the real migrations, and
/// drops it afterwards. AGRILINK_TEST_POSTGRES is a connection string to a server the tests may
/// create databases on (CI starts one as a service container). Without it the tests are skipped,
/// since the EF InMemory provider behind the other tests has no constraints or transactions.
/// </summary>
public sealed class PostgresDatabase : IAsyncLifetime
{
    public const string Variable = "AGRILINK_TEST_POSTGRES";

    private readonly string? _serverConnection = Environment.GetEnvironmentVariable(Variable);

    public string? ConnectionString { get; private set; }

    public bool Available => ConnectionString is not null;

    public AgriLinkDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>().UseNpgsql(ConnectionString!).Options);

    public async Task InitializeAsync()
    {
        if (string.IsNullOrWhiteSpace(_serverConnection))
        {
            return;
        }

        ConnectionString = new NpgsqlConnectionStringBuilder(_serverConnection)
        {
            Database = $"agrilink_it_{Guid.NewGuid():N}",
        }.ConnectionString;

        await using var db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (ConnectionString is null)
        {
            return;
        }

        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
    }
}

public class PostgresIntegrationTests : IClassFixture<PostgresDatabase>
{
    private readonly PostgresDatabase _database;

    public PostgresIntegrationTests(PostgresDatabase database)
    {
        _database = database;
    }

    private void SkipWithoutPostgres() =>
        Skip.IfNot(_database.Available, $"Set {PostgresDatabase.Variable} to run the PostgreSQL integration tests.");

    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..Math.Min(prefix.Length + 13, 60)];

    private static ApplicationUser NewUser(string email) => new()
    {
        UserName = email,
        NormalizedUserName = email.ToUpperInvariant(),
        Email = email,
        NormalizedEmail = email.ToUpperInvariant(),
        FullName = "Integration Test",
        SecurityStamp = Guid.NewGuid().ToString(),
    };

    [SkippableFact]
    public async Task Migrations_AllApply_AndNoneArePending()
    {
        SkipWithoutPostgres();
        await using var db = _database.CreateContext();

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
        var pending = await db.Database.GetPendingMigrationsAsync();

        Assert.Empty(pending);
        Assert.Equal(db.Database.GetMigrations().Count(), applied.Count);
    }

    [SkippableFact]
    public async Task Model_HasNoChangesMissingFromTheMigrations()
    {
        SkipWithoutPostgres();
        await using var db = _database.CreateContext();

        // The same comparison `dotnet ef migrations add` makes: the latest snapshot against the model
        // in code. A difference means someone changed an entity without adding a migration.
        var snapshot = db.GetService<IMigrationsAssembly>().ModelSnapshot!.Model;
        if (snapshot is IMutableModel mutable)
        {
            snapshot = mutable.FinalizeModel();
        }

        snapshot = db.GetService<IModelRuntimeInitializer>().Initialize(snapshot);
        var differences = db.GetService<IMigrationsModelDiffer>().GetDifferences(
            snapshot.GetRelationalModel(),
            db.GetService<IDesignTimeModel>().Model.GetRelationalModel());

        Assert.Empty(differences);
    }

    [SkippableFact]
    public async Task UniqueEmailIndex_RefusesASecondAccountWithTheSameEmail()
    {
        SkipWithoutPostgres();
        var email = $"{Unique("dup")}@agrilink.test";
        await using (var db = _database.CreateContext())
        {
            db.Users.Add(NewUser(email));
            await db.SaveChangesAsync();
        }

        // A different username, so only the email index can object.
        var clash = NewUser(email);
        clash.UserName = Unique("other");
        clash.NormalizedUserName = clash.UserName.ToUpperInvariant();
        await using var second = _database.CreateContext();
        second.Users.Add(clash);
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => second.SaveChangesAsync());

        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    [SkippableFact]
    public async Task Departments_ParallelCreatesWithOneName_OneSucceedsTheRestAre409()
    {
        SkipWithoutPostgres();
        int adminId;
        await using (var db = _database.CreateContext())
        {
            var admin = NewUser($"{Unique("admin")}@agrilink.test");
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            adminId = admin.Id;
        }

        var name = Unique("Race dept");
        var results = await Task.WhenAll(Enumerable.Range(0, 6).Select(async _ =>
        {
            await using var db = _database.CreateContext();
            var controller = new DepartmentsController(db, new CurrentUserService(db), new AuditLogService(db))
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(adminId, "Admin") },
                },
            };
            return (await controller.Create(new DepartmentRequest { Name = name })).Result;
        }));

        // Before the fix, the requests that lost the race after the "does it exist?" check hit the
        // unique index and came back as 500s.
        Assert.Single(results, r => r is ObjectResult { StatusCode: StatusCodes.Status201Created });
        Assert.All(
            results.Where(r => r is not ObjectResult { StatusCode: StatusCodes.Status201Created }),
            r => Assert.IsType<ConflictObjectResult>(r));
        await using var check = _database.CreateContext();
        Assert.Equal(1, await check.Departments.CountAsync(d => d.Name == name));
    }

    [SkippableFact]
    public async Task RolledBackTransaction_LeavesNothingBehind()
    {
        SkipWithoutPostgres();
        var name = Unique("Rolled back");
        await using (var db = _database.CreateContext())
        {
            await using var transaction = await db.Database.BeginIfSupportedAsync();
            Assert.NotNull(transaction);

            db.Departments.Add(new Department { Name = name });
            await db.SaveChangesAsync();
            await transaction!.RollbackAsync();
        }

        await using var check = _database.CreateContext();
        Assert.False(await check.Departments.AnyAsync(d => d.Name == name));
    }

    [SkippableFact]
    public async Task RestrictForeignKey_ABuyerWithPurchaseRequestsCannotBeDeleted()
    {
        SkipWithoutPostgres();
        int buyerProfileId;
        await using (var db = _database.CreateContext())
        {
            var farmerUser = NewUser($"{Unique("farmer")}@agrilink.test");
            var buyerUser = NewUser($"{Unique("buyer")}@agrilink.test");
            var farmer = new FarmerProfile { User = farmerUser, NIC = "199012345678", District = "Kandy" };
            var buyer = new BuyerProfile { User = buyerUser, BusinessName = "Buyer Co", District = "Colombo" };
            var crop = new Crop
            {
                CropType = "Tomato",
                PlantingDate = new DateOnly(2026, 6, 1),
                ExpectedHarvestDate = new DateOnly(2026, 10, 1),
                Field = new Field { Name = "North", Area = 1, Farm = new Farm { Name = "Hill", District = "Kandy", Area = 2, FarmerProfile = farmer } },
            };
            var listing = new HarvestListing
            {
                FarmerProfile = farmer, Crop = crop, Quantity = 100, AvailableQuantity = 100, PricePerUnit = 50,
                HarvestDate = new DateOnly(2026, 9, 1), Location = "Kandy",
            };
            db.PurchaseRequests.Add(new PurchaseRequest { Harvest = listing, BuyerProfile = buyer, RequestedQuantity = 10, PricePerUnit = 50 });
            await db.SaveChangesAsync();
            buyerProfileId = buyer.BuyerProfileId;
        }

        await using var second = _database.CreateContext();
        second.BuyerProfiles.Remove(await second.BuyerProfiles.SingleAsync(b => b.BuyerProfileId == buyerProfileId));
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => second.SaveChangesAsync());

        Assert.Equal(PostgresErrorCodes.RestrictViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    [SkippableFact]
    public async Task RowVersion_TwoEditsFromTheSameStartingPoint_TheSecondIsRefused()
    {
        SkipWithoutPostgres();
        int listingId;
        await using (var db = _database.CreateContext())
        {
            var farmer = new FarmerProfile { User = NewUser($"{Unique("seller")}@agrilink.test"), NIC = "199112345678", District = "Kandy" };
            var listing = new HarvestListing
            {
                FarmerProfile = farmer,
                Crop = new Crop
                {
                    CropType = "Paddy",
                    Field = new Field { Name = "Low", Area = 1, Farm = new Farm { Name = "Valley", District = "Kandy", Area = 2, FarmerProfile = farmer } },
                },
                Quantity = 100, AvailableQuantity = 100, PricePerUnit = 120, HarvestDate = new DateOnly(2026, 9, 1), Location = "Kandy",
            };
            db.HarvestListings.Add(listing);
            await db.SaveChangesAsync();
            listingId = listing.HarvestId;
        }

        // Two requests (say, the farmer on the website and on the phone) read the same stock.
        await using var first = _database.CreateContext();
        await using var second = _database.CreateContext();
        var a = await first.HarvestListings.SingleAsync(h => h.HarvestId == listingId);
        var b = await second.HarvestListings.SingleAsync(h => h.HarvestId == listingId);

        a.AvailableQuantity -= 70;
        await first.SaveChangesAsync();
        b.AvailableQuantity -= 70;

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => second.SaveChangesAsync());
        await using var check = _database.CreateContext();
        Assert.Equal(30, (await check.HarvestListings.SingleAsync(h => h.HarvestId == listingId)).AvailableQuantity);
    }

    [SkippableFact]
    public async Task Paging_TheLargestPageNumber_IsAnEmptyPageNotAnError()
    {
        SkipWithoutPostgres();
        await using var db = _database.CreateContext();

        // PostgreSQL rejects a negative OFFSET, which is what ?page=2147483647 used to overflow into.
        var page = await db.Departments.OrderBy(d => d.Name).ToPagedResponseAsync(int.MaxValue, 100);

        Assert.Empty(page.Items);
    }
}
