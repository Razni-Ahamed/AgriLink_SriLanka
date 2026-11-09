using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.PurchaseRequests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Chat;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

/// <summary>A buyer withdrawing their own request before the farmer answers it.</summary>
public class PurchaseRequestsWithdrawTests
{
    private const int FarmerUserId = 10;
    private const int BuyerUserId = 20;
    private const int OtherBuyerUserId = 21;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static void Seed(AgriLinkDbContext db, PurchaseRequestStatus status = PurchaseRequestStatus.Pending)
    {
        db.Users.AddRange(
            new ApplicationUser { Id = FarmerUserId, UserName = "farmer", Email = "farmer@agrilink.lk", FullName = "Farmer One" },
            new ApplicationUser { Id = BuyerUserId, UserName = "buyer", Email = "buyer@agrilink.lk", FullName = "Shanthi Fernando" },
            new ApplicationUser { Id = OtherBuyerUserId, UserName = "buyer2", Email = "buyer2@agrilink.lk", FullName = "Other Buyer" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });
        db.BuyerProfiles.AddRange(
            new BuyerProfile { BuyerProfileId = 1, UserId = BuyerUserId, BusinessName = "Fresh Co", District = "Colombo" },
            new BuyerProfile { BuyerProfileId = 2, UserId = OtherBuyerUserId, BusinessName = "Other Co", District = "Colombo" });
        var listing = new HarvestListing
        {
            HarvestId = 1,
            FarmerProfileId = 1,
            Quantity = 100,
            AvailableQuantity = 100,
            PricePerUnit = 300,
            Unit = QuantityUnit.Bunch,
            Location = "Kandy",
            Status = HarvestStatus.Active,
            Crop = new Crop
            {
                CropId = 1,
                CropType = "Banana",
                Field = new Field { FieldId = 1, Name = "F", Farm = new Farm { FarmId = 1, Name = "Farm", District = "Kandy", FarmerProfileId = 1 } },
            },
        };
        db.PurchaseRequests.Add(new PurchaseRequest
        {
            RequestId = 1,
            Harvest = listing,
            BuyerProfileId = 1,
            RequestedQuantity = 4,
            PricePerUnit = 300,
            Status = status,
        });
        db.SaveChanges();
    }

    private static PurchaseRequestsController CreateController(AgriLinkDbContext db, int userId, string role = "Buyer") => new(
        db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
        },
    };

    [Fact]
    public async Task Withdraw_APendingRequest_MarksItWithdrawnTellsTheFarmerAndAuditsIt()
    {
        using var db = CreateDb();
        Seed(db);

        var result = await CreateController(db, BuyerUserId).Withdraw(1);

        var response = Assert.IsType<PurchaseRequestResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Withdrawn", response.Status);
        Assert.Equal("Bunch", response.Unit);
        var notification = await db.Notifications.SingleAsync(n => n.UserId == FarmerUserId);
        Assert.Equal("Shanthi Fernando withdrew their request for 4 bunches of Banana.", notification.Message);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "PurchaseRequestWithdrawn" && a.EntityId == 1 && a.NewValue == "Withdrawn"));
    }

    [Theory]
    [InlineData(PurchaseRequestStatus.Accepted)]
    [InlineData(PurchaseRequestStatus.Declined)]
    [InlineData(PurchaseRequestStatus.Cancelled)]
    [InlineData(PurchaseRequestStatus.Withdrawn)]
    public async Task Withdraw_OnceAnswered_IsRefused(PurchaseRequestStatus status)
    {
        using var db = CreateDb();
        Seed(db, status);

        var result = await CreateController(db, BuyerUserId).Withdraw(1);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(status, (await db.PurchaseRequests.SingleAsync()).Status);
    }

    [Fact]
    public async Task Withdraw_AnotherBuyersRequest_IsForbidden()
    {
        using var db = CreateDb();
        Seed(db);

        var result = await CreateController(db, OtherBuyerUserId).Withdraw(1);

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Equal(PurchaseRequestStatus.Pending, (await db.PurchaseRequests.SingleAsync()).Status);
    }

    [Fact]
    public async Task Withdraw_AnUnknownRequest_IsNotFound()
    {
        using var db = CreateDb();
        Seed(db);

        var result = await CreateController(db, BuyerUserId).Withdraw(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Respond_ToAWithdrawnRequest_IsRefused()
    {
        using var db = CreateDb();
        Seed(db, PurchaseRequestStatus.Withdrawn);

        var result = await CreateController(db, FarmerUserId, "Farmer").Respond(1, new RespondPurchaseRequestRequest { Action = "accept" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Orders);
    }

    [Fact]
    public async Task AWithdrawnRequestsChat_IsClosed()
    {
        using var db = CreateDb();
        Seed(db, PurchaseRequestStatus.Withdrawn);

        var subject = await ConversationSubject.ForRequestAsync(db, 1, CancellationToken.None);

        Assert.True(subject!.IsClosed);
    }
}
