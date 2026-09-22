using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Orders;
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
        var farmerUser = new ApplicationUser
        {
            Id = FarmerUserId, UserName = "farmer@agrilink.lk", Email = "farmer@agrilink.lk", FullName = "Farmer One",
        };
        var buyerUser = new ApplicationUser
        {
            Id = BuyerUserId, UserName = "buyer@agrilink.lk", Email = "buyer@agrilink.lk", FullName = "Buyer One",
        };
        db.Users.AddRange(farmerUser, buyerUser);

        var farmer = new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, User = farmerUser, NIC = "1", District = "Kandy", PhoneNumber = "0711111111" };
        var buyer = new BuyerProfile { BuyerProfileId = 1, UserId = BuyerUserId, User = buyerUser, BusinessName = "Buyer Co", District = "Colombo", BusinessPhone = "0722222222" };
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

    [Fact]
    public async Task GetById_IncludesEachSidesProfilePhoto_OrNullForTheDefault()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);
        var farmerUser = await db.Users.SingleAsync(u => u.Id == FarmerUserId);
        farmerUser.ProfilePhotoUrl = "https://res.cloudinary.com/demo/image/upload/farmer.jpg";
        await db.SaveChangesAsync();

        var result = await CreateController(db, BuyerUserId, "Buyer").GetById(1);

        var response = Assert.IsType<OrderResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("https://res.cloudinary.com/demo/image/upload/farmer.jpg", response.FarmerPhotoUrl);
        Assert.Null(response.BuyerPhotoUrl);
    }

    [Fact]
    public async Task GetById_ByTheOwningFarmer_IncludesBothSidesContactAndListingDetails()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, FarmerUserId, "Farmer").GetById(1);

        var response = Assert.IsType<OrderResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Farmer One", response.FarmerName);
        Assert.Equal("0711111111", response.FarmerPhone);
        Assert.Equal("farmer@agrilink.lk", response.FarmerEmail);
        Assert.Equal("Kandy", response.FarmerDistrict);
        Assert.Equal("Buyer One", response.BuyerName);
        Assert.Equal("Buyer Co", response.BuyerBusinessName);
        Assert.Equal("0722222222", response.BuyerPhone);
        Assert.Equal("buyer@agrilink.lk", response.BuyerEmail);
        Assert.Equal("Colombo", response.BuyerDistrict);
        Assert.Equal("Tomato", response.CropType);
        Assert.Equal(50, response.PricePerUnit);
        Assert.Equal("Kandy Town", response.HarvestLocation);
    }

    [Fact]
    public async Task GetById_ByTheOwningBuyer_IncludesContactDetails()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, BuyerUserId, "Buyer").GetById(1);

        var response = Assert.IsType<OrderResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Farmer One", response.FarmerName);
        Assert.Equal("Buyer One", response.BuyerName);
    }

    [Fact]
    public async Task GetById_ByAdmin_IncludesContactDetails()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, userId: 999, "Admin").GetById(1);

        var response = Assert.IsType<OrderResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Farmer One", response.FarmerName);
    }

    [Fact]
    public async Task GetById_ByAThirdParty_IsForbidden()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, userId: 12345, "Buyer").GetById(1);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task Mine_AsFarmer_IncludesContactAndListingDetails()
    {
        using var db = CreateDb();
        SeedConfirmedOrder(db);

        var result = await CreateController(db, FarmerUserId, "Farmer").Mine();

        var response = Assert.Single(Assert.IsType<OkObjectResult>(result.Result).Value as IEnumerable<OrderResponse> ?? Array.Empty<OrderResponse>());
        Assert.Equal("Buyer One", response.BuyerName);
        Assert.Equal("Tomato", response.CropType);
    }
}
