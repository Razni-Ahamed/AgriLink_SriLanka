using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class OrdersControllerTests
{
    private const int FarmerUserId = 10;
    private const int BuyerUserId = 20;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    // A listing that accepting this 100 kg order sold out, as PurchaseRequestsController.Respond leaves it.
    private static Order SeedConfirmedOrder(AgriLinkDbContext db)
    {
        var farmer = new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" };
        var buyer = new BuyerProfile { BuyerProfileId = 1, UserId = BuyerUserId, BusinessName = "Buyer Co", District = "Colombo" };
        db.FarmerProfiles.Add(farmer);
        db.BuyerProfiles.Add(buyer);

        var listing = new HarvestListing
        {
            HarvestId = 1,
            FarmerProfileId = 1,
            Crop = new Crop
            {
                CropId = 1,
                CropType = "Tomato",
                Field = new Field { FieldId = 1, Name = "Field 1", Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = 1 } },
            },
            Quantity = 100,
            AvailableQuantity = 0,
            PricePerUnit = 50,
            Location = "Kandy Town",
            Status = HarvestStatus.Sold,
        };
        var request = new PurchaseRequest
        {
            RequestId = 1,
            Harvest = listing,
            BuyerProfileId = 1,
            RequestedQuantity = 100,
            Status = PurchaseRequestStatus.Accepted,
        };
        var order = new Order
        {
            OrderId = 1,
            Request = request,
            FarmerProfile = farmer,
            BuyerProfile = buyer,
            TotalQuantity = 100,
            TotalAmount = 5000,
            Status = OrderStatus.Confirmed,
        };
        db.Orders.Add(order);
        db.SaveChanges();
        return order;
    }

    private static OrdersController CreateController(AgriLinkDbContext db, int userId, string role) =>
        new(db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
            },
        };

    [Fact]
    public async Task Complete_ByBuyer_SetsCompletedAtAndNotifiesTheFarmer()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, BuyerUserId, "Buyer").Complete(1);

        Assert.IsType<OkObjectResult>(result.Result);
        var order = await db.Orders.SingleAsync();
        Assert.Equal(OrderStatus.Completed, order.Status);
        Assert.NotNull(order.CompletedAt);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == FarmerUserId);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "OrderCompleted");
    }

    [Fact]
    public async Task Cancel_ByFarmer_ReturnsQuantityAndReopensSoldOutListing()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, FarmerUserId, "Farmer").Cancel(1);

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(OrderStatus.Cancelled, (await db.Orders.SingleAsync()).Status);
        var listing = await db.HarvestListings.SingleAsync();
        Assert.Equal(100, listing.AvailableQuantity);
        Assert.Equal(HarvestStatus.Active, listing.Status);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == BuyerUserId);
    }

    [Fact]
    public async Task Complete_BySomeoneOutsideTheOrder_IsForbidden()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, userId: 99, "Buyer").Complete(1);

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Equal(OrderStatus.Confirmed, (await db.Orders.SingleAsync()).Status);
    }

    [Fact]
    public async Task Cancel_AlreadyCompletedOrder_IsRejected()
    {
        using var db = CreateDb();
        var order = SeedConfirmedOrder(db);
        order.Status = OrderStatus.Completed;
        db.SaveChanges();

        var result = await CreateController(db, FarmerUserId, "Farmer").Cancel(1);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(0, (await db.HarvestListings.SingleAsync()).AvailableQuantity);
    }
}
