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

/// <summary>The price guide a farmer sees while pricing a listing: recent agreed prices from
/// completed orders, for their district and nationwide.</summary>
public class HarvestsControllerPriceGuideTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static int _nextId;

    private static void AddSale(
        AgriLinkDbContext db, string cropType, string district, decimal pricePerUnit, decimal quantity,
        OrderStatus status = OrderStatus.Completed, int completedDaysAgo = 5)
    {
        var id = Interlocked.Increment(ref _nextId);
        var listing = new HarvestListing
        {
            HarvestId = id,
            FarmerProfileId = 1,
            Quantity = quantity,
            PricePerUnit = pricePerUnit + 10, // the listing price moved on; the order keeps the agreed one
            Location = district,
            Crop = new Crop
            {
                CropId = id,
                CropType = cropType,
                Field = new Field { FieldId = id, Name = "F", Farm = new Farm { FarmId = id, Name = "Farm", District = district, FarmerProfileId = 1 } },
            },
        };
        db.Orders.Add(new Order
        {
            OrderId = id,
            FarmerProfileId = 1,
            BuyerProfileId = 1,
            TotalQuantity = quantity,
            PricePerUnit = pricePerUnit,
            TotalAmount = quantity * pricePerUnit,
            Status = status,
            CompletedAt = status == OrderStatus.Completed ? DateTime.UtcNow.AddDays(-completedDaysAgo) : null,
            Request = new PurchaseRequest { RequestId = id, BuyerProfileId = 1, RequestedQuantity = quantity, PricePerUnit = pricePerUnit, Harvest = listing },
        });
    }

    private static HarvestsController CreateController(AgriLinkDbContext db) => new(
        db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(10, "Farmer") },
        },
    };

    private static async Task<PriceGuideResponse> GuideAsync(AgriLinkDbContext db, string cropType, string? district) =>
        Assert.IsType<PriceGuideResponse>(Assert.IsType<OkObjectResult>(
            (await CreateController(db).PriceGuide(cropType, district, CancellationToken.None)).Result).Value);

    [Fact]
    public async Task PriceGuide_AveragesAgreedPricesWeightedByQuantity_ForTheDistrictAndNationwide()
    {
        using var db = CreateDb();
        AddSale(db, "Tomato", "Kandy", pricePerUnit: 100, quantity: 100);
        AddSale(db, "Tomato", "Kandy", pricePerUnit: 130, quantity: 50);
        AddSale(db, "Tomato", "Kandy", pricePerUnit: 160, quantity: 50);
        AddSale(db, "Tomato", "Galle", pricePerUnit: 90, quantity: 200);
        await db.SaveChangesAsync();

        var guide = await GuideAsync(db, "Tomato", "Kandy");

        Assert.Equal(90, guide.WindowDays);
        var kandy = guide.InDistrict!;
        Assert.Equal(3, kandy.Sales);
        Assert.Equal(200, kandy.TotalQuantity);
        Assert.Equal(122.5m, kandy.AveragePricePerUnit); // (100×100 + 130×50 + 160×50) / 200
        Assert.Equal(100, kandy.MinPricePerUnit);
        Assert.Equal(160, kandy.MaxPricePerUnit);

        var nationwide = guide.Nationwide!;
        Assert.Equal(4, nationwide.Sales);
        Assert.Equal(106.25m, nationwide.AveragePricePerUnit); // (24,500 + 18,000) / 400
        Assert.Equal(90, nationwide.MinPricePerUnit);
    }

    [Fact]
    public async Task PriceGuide_CountsOnlyRecentCompletedOrdersOfThatCrop()
    {
        using var db = CreateDb();
        AddSale(db, "Tomato", "Kandy", 100, 10);
        AddSale(db, "Tomato", "Kandy", 100, 10);
        AddSale(db, "Tomato", "Kandy", 100, 10);
        AddSale(db, "Tomato", "Kandy", 999, 10, OrderStatus.Cancelled);
        AddSale(db, "Tomato", "Kandy", 999, 10, OrderStatus.Confirmed);
        AddSale(db, "Tomato", "Kandy", 999, 10, completedDaysAgo: 120);
        AddSale(db, "Potato", "Kandy", 999, 10);
        await db.SaveChangesAsync();

        var guide = await GuideAsync(db, "tomato", "kandy");

        Assert.Equal(3, guide.InDistrict!.Sales);
        Assert.Equal(100, guide.InDistrict.MaxPricePerUnit);
    }

    [Fact]
    public async Task PriceGuide_BelowThreeSales_GivesNoFigures_SoNoSingleDealIsRevealed()
    {
        using var db = CreateDb();
        AddSale(db, "Tomato", "Kandy", 100, 10);
        AddSale(db, "Tomato", "Kandy", 120, 10);
        AddSale(db, "Tomato", "Galle", 110, 10);
        await db.SaveChangesAsync();

        var guide = await GuideAsync(db, "Tomato", "Kandy");

        Assert.Null(guide.InDistrict);
        Assert.Equal(3, guide.Nationwide!.Sales);
        Assert.Equal(3, guide.MinimumSales);
    }

    [Fact]
    public async Task PriceGuide_NoSalesAtAll_IsEmptyNotAnError()
    {
        using var db = CreateDb();

        var guide = await GuideAsync(db, "Cassava", district: null);

        Assert.Equal("Cassava", guide.CropType);
        Assert.Null(guide.District);
        Assert.Null(guide.InDistrict);
        Assert.Null(guide.Nationwide);
    }
}
