using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Harvests;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Images;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Integration;

/// <summary>
/// The marketplace and issue searches match each table separately and union the ids so the
/// trigram indexes can be used. These check, against PostgreSQL, that every searched column
/// still matches case-insensitively and that LIKE wildcards in the term are taken literally.
/// </summary>
public class PostgresSearchTests : IClassFixture<PostgresDatabase>
{
    private readonly PostgresDatabase _database;

    public PostgresSearchTests(PostgresDatabase database)
    {
        _database = database;
    }

    private void SkipWithoutPostgres() =>
        Skip.IfNot(_database.Available, $"Set {PostgresDatabase.Variable} to run the PostgreSQL integration tests.");

    private static FarmerProfile NewFarmer(string tag, string fullName) => new()
    {
        User = new ApplicationUser
        {
            UserName = $"farmer-{tag}-{Guid.NewGuid():N}@agrilink.test",
            Email = $"farmer-{tag}@agrilink.test",
            FullName = fullName,
            SecurityStamp = Guid.NewGuid().ToString(),
            IsActive = true,
            RegistrationStatus = RegistrationStatus.Approved,
        },
        NIC = "199012345678",
        District = "Kandy",
    };

    private static Crop NewCrop(FarmerProfile farmer, string cropType = "Okra", string variety = "Plain", string district = "Galle") => new()
    {
        CropType = cropType,
        Variety = variety,
        Field = new Field { Name = "F", Area = 1, Farm = new Farm { Name = "Farm", District = district, Area = 1, FarmerProfile = farmer } },
    };

    private static HarvestListing NewListing(FarmerProfile farmer, Crop crop, string location) => new()
    {
        FarmerProfile = farmer,
        Crop = crop,
        Quantity = 10,
        AvailableQuantity = 10,
        PricePerUnit = 100,
        Location = location,
        HarvestDate = new DateOnly(2026, 11, 1),
        Status = HarvestStatus.Active,
    };

    [SkippableFact]
    public async Task HarvestSearch_MatchesEveryColumnCaseInsensitively()
    {
        SkipWithoutPostgres();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var upper = tag.ToUpperInvariant();
        int byCropType, byVariety, byLocation, byDistrict, literal;
        await using (var db = _database.CreateContext())
        {
            var farmer = NewFarmer(tag, "Farmer");
            var listings = new[]
            {
                NewListing(farmer, NewCrop(farmer, cropType: $"Tomato{upper}"), "Town"),
                NewListing(farmer, NewCrop(farmer, variety: $"Roma {upper}"), "Town"),
                NewListing(farmer, NewCrop(farmer), $"Market {upper}"),
                NewListing(farmer, NewCrop(farmer, district: $"D{upper}"), "Town"),
                // Would match if "_" were a LIKE wildcard rather than a literal character.
                NewListing(farmer, NewCrop(farmer), $"Market {tag}X"),
            };
            db.HarvestListings.AddRange(listings);
            await db.SaveChangesAsync();
            (byCropType, byVariety, byLocation, byDistrict, literal) =
                (listings[0].HarvestId, listings[1].HarvestId, listings[2].HarvestId, listings[3].HarvestId, listings[4].HarvestId);
        }

        await using var read = _database.CreateContext();
        var controller = new HarvestsController(read, new CurrentUserService(read), new AuditLogService(read), new NotificationService(read));

        async Task<List<int>> Search(string term)
        {
            var result = await controller.GetAll(null, null, term, page: 1, pageSize: 50);
            var page = Assert.IsType<PagedResponse<HarvestListingResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
            return page.Items.Select(h => h.HarvestId).Order().ToList();
        }

        Assert.Equal(new[] { byCropType, byVariety, byLocation, byDistrict, literal }.Order(), await Search($" {tag} "));
        Assert.Equal(new[] { byLocation, literal }.Order(), await Search($"market {tag}"));
        Assert.Equal(new[] { literal }, await Search($"{tag}x"));
        Assert.Empty(await Search($"{tag}_"));
        Assert.Empty(await Search($"{tag}%"));
    }

    [SkippableFact]
    public async Task IssueSearch_MatchesEveryColumnCaseInsensitively()
    {
        SkipWithoutPostgres();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var upper = tag.ToUpperInvariant();
        var ids = new List<int>();
        await using (var db = _database.CreateContext())
        {
            var farmer = NewFarmer(tag, "Farmer");
            var reporter = NewFarmer(tag, $"Nimal {upper}");
            CropIssue Issue(FarmerProfile by, Crop crop, string title = "Spots", string description = "d") =>
                new() { FarmerProfile = by, Crop = crop, Title = title, Description = description };

            var issues = new[]
            {
                Issue(farmer, NewCrop(farmer), title: $"Spots {upper}"),
                Issue(farmer, NewCrop(farmer), description: $"Leaves curl near {upper}"),
                Issue(farmer, NewCrop(farmer, cropType: $"Chilli{upper}")),
                Issue(farmer, NewCrop(farmer, variety: $"MI-{upper}")),
                Issue(farmer, NewCrop(farmer, district: $"D{upper}")),
                Issue(reporter, NewCrop(reporter)),
            };
            db.CropIssues.AddRange(issues);
            db.CropIssues.Add(Issue(farmer, NewCrop(farmer), title: $"Spots {tag}X"));
            await db.SaveChangesAsync();
            ids.AddRange(issues.Select(i => i.IssueId));
        }

        await using var read = _database.CreateContext();
        var admin = new IssuesController(read, new CurrentUserService(read), Mock.Of<IAgentOrchestrator>(), Mock.Of<IIssuePhotoProcessor>(),
            Mock.Of<IImageStorageService>(), NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(1, "Admin") },
            },
        };

        async Task<List<int>> Search(string term)
        {
            var result = await admin.GetAll(1, 50, search: term);
            var page = Assert.IsType<PagedResponse<CropIssueResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
            return page.Items.Select(i => i.IssueId).Order().ToList();
        }

        // The X-suffixed title contains the tag too.
        var found = await Search(tag);
        Assert.Equal(7, found.Count);
        Assert.Subset(found.ToHashSet(), ids.ToHashSet());
        Assert.Equal(new[] { ids[5] }, await Search($"nimal {tag}"));
        Assert.Empty(await Search($"{tag}_"));
    }
}
