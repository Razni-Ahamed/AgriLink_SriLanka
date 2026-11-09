using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Farmer;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class FarmerControllerTests
{
    private const int FarmerUserId = 10;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static FarmerController CreateController(AgriLinkDbContext db, int userId = FarmerUserId) => new(db, new CurrentUserService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, "Farmer") },
        },
    };

    private static Crop NewCrop(int id, int farmerProfileId) => new()
    {
        CropId = id,
        CropType = "Tomato",
        Field = new Field { FieldId = id, Name = "F", Farm = new Farm { FarmId = id, Name = "Farm", District = "Kandy", FarmerProfileId = farmerProfileId } },
    };

    /// <summary>Two farmers' worth of issues, listings, requests and orders; only farmer 1's should count.</summary>
    private static void Seed(AgriLinkDbContext db)
    {
        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = 2, UserId = 11, NIC = "2", District = "Galle" });
        var mine = NewCrop(1, 1);
        var theirs = NewCrop(2, 2);

        CropIssue Issue(int id, Crop crop, int farmer, IssueStatus status, string title = "Leaf spots") => new()
        {
            IssueId = id, Crop = crop, FarmerProfileId = farmer, Title = title, Status = status,
        };
        var resolvedOld = Issue(1, mine, 1, IssueStatus.Resolved, "Old blight");
        var resolvedNew = Issue(2, mine, 1, IssueStatus.Resolved, "Yellow leaves");
        db.CropIssues.AddRange(
            resolvedOld, resolvedNew,
            Issue(3, mine, 1, IssueStatus.Pending),
            Issue(4, mine, 1, IssueStatus.AwaitingReview),
            Issue(5, theirs, 2, IssueStatus.Pending));
        db.AIAdvisories.AddRange(
            new AIAdvisory { AdvisoryId = 1, Issue = resolvedOld, Status = AdvisoryStatus.Approved, ReviewedAt = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AIAdvisory { AdvisoryId = 2, Issue = resolvedNew, Status = AdvisoryStatus.Approved, ReviewedAt = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc) });

        HarvestListing Listing(int id, Crop crop, int farmer, HarvestStatus status) => new()
        {
            HarvestId = id, Crop = crop, FarmerProfileId = farmer, Quantity = 10, AvailableQuantity = 10, PricePerUnit = 100, Location = "K", Status = status,
        };
        var active = Listing(1, mine, 1, HarvestStatus.Active);
        db.HarvestListings.AddRange(active, Listing(2, mine, 1, HarvestStatus.Sold), Listing(3, theirs, 2, HarvestStatus.Active));
        db.PurchaseRequests.AddRange(
            new PurchaseRequest { RequestId = 1, Harvest = active, BuyerProfileId = 1, RequestedQuantity = 1, Status = PurchaseRequestStatus.Pending },
            new PurchaseRequest { RequestId = 2, Harvest = active, BuyerProfileId = 1, RequestedQuantity = 1, Status = PurchaseRequestStatus.Accepted },
            new PurchaseRequest { RequestId = 3, Harvest = active, BuyerProfileId = 1, RequestedQuantity = 1, Status = PurchaseRequestStatus.Withdrawn });
        db.Orders.AddRange(
            new Order { OrderId = 1, RequestId = 2, FarmerProfileId = 1, BuyerProfileId = 1, Status = OrderStatus.Confirmed },
            new Order { OrderId = 2, RequestId = 9, FarmerProfileId = 1, BuyerProfileId = 1, Status = OrderStatus.Completed },
            new Order { OrderId = 3, RequestId = 8, FarmerProfileId = 2, BuyerProfileId = 1, Status = OrderStatus.Confirmed });
        db.SaveChanges();
    }

    [Fact]
    public async Task Overview_CountsOnlyTheCallingFarmersOpenWork_AndPicksTheNewestAdvice()
    {
        using var db = CreateDb();
        Seed(db);

        var result = await CreateController(db).Overview(CancellationToken.None);

        var overview = Assert.IsType<FarmerOverviewResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, overview.OpenIssues);
        Assert.Equal(1, overview.ActiveListings);
        Assert.Equal(1, overview.PendingRequests);
        Assert.Equal(1, overview.OrdersInProgress);
        Assert.NotNull(overview.LatestAdvice);
        Assert.Equal(2, overview.LatestAdvice!.AdvisoryId);
        Assert.Equal("Yellow leaves", overview.LatestAdvice.IssueTitle);
        Assert.Equal("Tomato", overview.LatestAdvice.CropType);
    }

    [Fact]
    public async Task Overview_ForANewFarmer_IsAllZeroWithNoAdvice()
    {
        using var db = CreateDb();
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Overview(CancellationToken.None);

        var overview = Assert.IsType<FarmerOverviewResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(0, overview.OpenIssues + overview.ActiveListings + overview.PendingRequests + overview.OrdersInProgress);
        Assert.Null(overview.LatestAdvice);
    }

    [Fact]
    public async Task Overview_WithoutAFarmerProfile_IsForbidden()
    {
        using var db = CreateDb();

        var result = await CreateController(db, userId: 99).Overview(CancellationToken.None);

        Assert.IsType<ForbidResult>(result.Result);
    }
}
