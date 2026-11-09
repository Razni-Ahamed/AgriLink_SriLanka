using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Harvests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

/// <summary>Listing units (kg, piece, bunch…) and the cap at a crop's expected harvest.</summary>
public class HarvestsControllerUnitAndYieldTests
{
    private const int FarmerUserId = 10;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Crop SeedCrop(AgriLinkDbContext db, decimal expectedKg)
    {
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });
        var crop = new Crop
        {
            CropId = 1,
            CropType = "Tomato",
            Variety = "Thilina",
            PlantingDate = new DateOnly(2026, 6, 1),
            ExpectedQuantity = expectedKg,
            Field = new Field
            {
                FieldId = 1,
                Name = "Field 1",
                Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = 1 },
            },
        };
        db.Crops.Add(crop);
        db.SaveChanges();
        return crop;
    }

    private static void SeedListing(AgriLinkDbContext db, int id, decimal quantity, decimal available, HarvestStatus status, QuantityUnit unit = QuantityUnit.Kg)
    {
        db.HarvestListings.Add(new HarvestListing
        {
            HarvestId = id,
            FarmerProfileId = 1,
            CropId = 1,
            Quantity = quantity,
            AvailableQuantity = available,
            HarvestDate = new DateOnly(2026, 9, 1),
            PricePerUnit = 100,
            Unit = unit,
            Location = "Kandy",
            Status = status,
        });
        db.SaveChanges();
    }

    private static HarvestsController CreateController(AgriLinkDbContext db) => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db),
        new NotificationService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(FarmerUserId, "Farmer") },
        },
    };

    private static CreateHarvestListingRequest NewListing(decimal quantity, QuantityUnit unit = QuantityUnit.Kg) => new()
    {
        CropId = 1,
        Quantity = quantity,
        HarvestDate = new DateOnly(2026, 9, 1),
        PricePerUnit = 120,
        Unit = unit,
        Location = "Kandy",
    };

    private static string? MessageOf(IActionResult? result) =>
        Assert.IsType<BadRequestObjectResult>(result).Value?.GetType().GetProperty("message")?.GetValue(Assert.IsType<BadRequestObjectResult>(result).Value) as string;

    [Fact]
    public async Task Create_SavesAndReturnsTheUnit()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);

        var result = await CreateController(db).Create(NewListing(40, QuantityUnit.Bunch));

        var response = Assert.IsType<HarvestListingResponse>(Assert.IsType<ObjectResult>(result.Result).Value);
        Assert.Equal("Bunch", response.Unit);
        Assert.Equal(QuantityUnit.Bunch, (await db.HarvestListings.SingleAsync()).Unit);
    }

    [Fact]
    public void Create_WithoutAUnit_MeansKg()
    {
        Assert.Equal(QuantityUnit.Kg, new CreateHarvestListingRequest().Unit);
    }

    [Fact]
    public async Task Create_UpToTheExpectedHarvest_IsAllowed()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);
        SeedListing(db, 1, quantity: 300, available: 300, HarvestStatus.Active);

        var result = await CreateController(db).Create(NewListing(200));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
    }

    [Fact]
    public async Task Create_MoreThanTheExpectedHarvest_IsRefusedWithWhatIsLeft()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);
        SeedListing(db, 1, quantity: 300, available: 0, HarvestStatus.Sold);

        var result = await CreateController(db).Create(NewListing(250));

        var message = MessageOf(result.Result);
        Assert.Contains("at most 200 kg more", message);
        Assert.Contains("update the crop's expected quantity", message);
        Assert.Equal(1, await db.HarvestListings.CountAsync());
    }

    [Fact]
    public async Task Create_ACancelledListingCountsOnlyWhatItSold()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);
        // 400 kg listed, 100 kg of it sold, then cancelled: 400 kg are free again.
        SeedListing(db, 1, quantity: 400, available: 300, HarvestStatus.Cancelled);

        var result = await CreateController(db).Create(NewListing(400));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
    }

    [Fact]
    public async Task Create_InAnotherUnit_IsNotCheckedAgainstTheKgEstimate()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 50);

        var result = await CreateController(db).Create(NewListing(500, QuantityUnit.Piece));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
    }

    [Fact]
    public async Task Update_TheUnitBeforeAnyRequest_IsAllowed()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);
        SeedListing(db, 1, quantity: 100, available: 100, HarvestStatus.Active);

        var result = await CreateController(db).Update(1, new UpdateHarvestListingRequest { Unit = QuantityUnit.Sack });

        var response = Assert.IsType<HarvestListingResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Sack", response.Unit);
    }

    [Fact]
    public async Task Update_TheUnitAfterARequest_IsRefused()
    {
        using var db = CreateDb();
        SeedCrop(db, expectedKg: 500);
        SeedListing(db, 1, quantity: 100, available: 100, HarvestStatus.Active);
        db.PurchaseRequests.Add(new PurchaseRequest { RequestId = 1, HarvestId = 1, BuyerProfileId = 1, RequestedQuantity = 5, PricePerUnit = 100, Status = PurchaseRequestStatus.Declined });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Update(1, new UpdateHarvestListingRequest { Unit = QuantityUnit.Sack });

        Assert.Contains("unit can't be changed", MessageOf(result.Result));
        Assert.Equal(QuantityUnit.Kg, (await db.HarvestListings.SingleAsync()).Unit);
    }

    [Theory]
    [InlineData(1, QuantityUnit.Kg, "1 kg")]
    [InlineData(2.5, QuantityUnit.Kg, "2.5 kg")]
    [InlineData(1, QuantityUnit.Bunch, "1 bunch")]
    [InlineData(3, QuantityUnit.Bunch, "3 bunches")]
    [InlineData(12, QuantityUnit.Piece, "12 pieces")]
    [InlineData(1, QuantityUnit.Crate, "1 crate")]
    [InlineData(4, QuantityUnit.Sack, "4 sacks")]
    public void Describe_NamesTheUnit(decimal quantity, QuantityUnit unit, string expected)
    {
        Assert.Equal(expected, QuantityUnits.Describe(quantity, unit));
    }
}
