using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.PurchaseRequests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class PurchaseRequestsControllerTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PurchaseRequest SeedPendingRequest(AgriLinkDbContext db, int farmerUserId = 10, int buyerUserId = 20)
    {
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = farmerUserId, NIC = "1", District = "Kandy" });
        db.BuyerProfiles.Add(new BuyerProfile { BuyerProfileId = 1, UserId = buyerUserId, BusinessName = "Buyer Co", District = "Colombo" });

        var crop = new Crop
        {
            CropId = 1,
            CropType = "Tomato",
            Variety = "Roma",
            Field = new Field
            {
                FieldId = 1,
                Name = "Field 1",
                Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = 1 },
            },
        };

        var listing = new HarvestListing
        {
            HarvestId = 1,
            FarmerProfileId = 1,
            CropId = 1,
            Crop = crop,
            Quantity = 100,
            AvailableQuantity = 100,
            HarvestDate = DateOnly.FromDateTime(DateTime.UtcNow),
            PricePerUnit = 50,
            Location = "Kandy Town",
            Status = HarvestStatus.Active,
        };
        db.HarvestListings.Add(listing);

        var request = new PurchaseRequest
        {
            RequestId = 1,
            HarvestId = 1,
            Harvest = listing,
            BuyerProfileId = 1,
            RequestedQuantity = 20,
            Status = PurchaseRequestStatus.Pending,
        };
        db.PurchaseRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    private static PurchaseRequestsController CreateController(AgriLinkDbContext db, int actingUserId, string role = "Farmer") => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
        },
    };

    [Fact]
    public async Task Respond_Accept_CreatesOrderAndRecordsAudit()
    {
        using var db = CreateDb();
        var request = SeedPendingRequest(db, farmerUserId: 10);
        var controller = CreateController(db, actingUserId: 10);

        var result = await controller.Respond(request.RequestId, new RespondPurchaseRequestRequest { Action = "accept" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(await db.Orders.FirstOrDefaultAsync(o => o.RequestId == request.RequestId));

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == request.RequestId && a.Action == "PurchaseRequestAccepted");
        Assert.NotNull(auditLog);
        Assert.Equal(10, auditLog!.UserId);
        Assert.Equal(nameof(PurchaseRequestStatus.Pending), auditLog.OldValue);
        Assert.Equal(nameof(PurchaseRequestStatus.Accepted), auditLog.NewValue);
    }

    [Fact]
    public async Task Respond_Decline_RecordsAuditWithoutCreatingAnOrder()
    {
        using var db = CreateDb();
        var request = SeedPendingRequest(db, farmerUserId: 10);
        var controller = CreateController(db, actingUserId: 10);

        var result = await controller.Respond(request.RequestId, new RespondPurchaseRequestRequest { Action = "decline" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Null(await db.Orders.FirstOrDefaultAsync(o => o.RequestId == request.RequestId));

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == request.RequestId && a.Action == "PurchaseRequestDeclined");
        Assert.NotNull(auditLog);
        Assert.Equal(nameof(PurchaseRequestStatus.Declined), auditLog!.NewValue);
    }

    [Fact]
    public async Task Create_ReturnsResponseEnrichedWithHarvestContext()
    {
        using var db = CreateDb();
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = 10, NIC = "1", District = "Kandy" });
        db.BuyerProfiles.Add(new BuyerProfile { BuyerProfileId = 1, UserId = 20, BusinessName = "Buyer Co", District = "Colombo" });
        var crop = new Crop
        {
            CropId = 1,
            CropType = "Rice",
            Field = new Field { FieldId = 1, Name = "Field 1", Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = 1 } },
        };
        db.HarvestListings.Add(new HarvestListing
        {
            HarvestId = 1,
            FarmerProfileId = 1,
            CropId = 1,
            Crop = crop,
            Quantity = 100,
            AvailableQuantity = 100,
            HarvestDate = DateOnly.FromDateTime(DateTime.UtcNow),
            PricePerUnit = 75,
            Location = "Kandy Town",
            Status = HarvestStatus.Active,
        });
        db.SaveChanges();
        var controller = CreateController(db, actingUserId: 20, role: "Buyer");

        var result = await controller.Create(new CreatePurchaseRequestRequest { HarvestId = 1, RequestedQuantity = 10 });

        var response = Assert.IsType<PurchaseRequestResponse>(Assert.IsType<ObjectResult>(result.Result).Value);
        Assert.Equal("Rice", response.CropType);
        Assert.Equal("Kandy", response.District);
        Assert.Equal(75, response.PricePerUnit);
    }

    [Fact]
    public async Task Sent_ReturnsOnlyTheCallingBuyersOwnRequestsAcrossAllStatuses()
    {
        using var db = CreateDb();
        var ownRequest = SeedPendingRequest(db, farmerUserId: 10, buyerUserId: 20);
        ownRequest.Status = PurchaseRequestStatus.Declined;
        db.SaveChanges();

        // A second buyer's request on the same listing — "sent" must not leak into it.
        db.BuyerProfiles.Add(new BuyerProfile { BuyerProfileId = 2, UserId = 30, BusinessName = "Other Buyer", District = "Galle" });
        db.PurchaseRequests.Add(new PurchaseRequest
        {
            RequestId = 2,
            HarvestId = 1,
            BuyerProfileId = 2,
            RequestedQuantity = 5,
            Status = PurchaseRequestStatus.Pending,
        });
        db.SaveChanges();

        var controller = CreateController(db, actingUserId: 20, role: "Buyer");

        var result = await controller.Sent();

        var requests = Assert.IsType<OkObjectResult>(result.Result).Value as IEnumerable<PurchaseRequestResponse>;
        var only = Assert.Single(requests!);
        Assert.Equal(ownRequest.RequestId, only.RequestId);
        Assert.Equal(nameof(PurchaseRequestStatus.Declined), only.Status);
        Assert.Equal("Tomato", only.CropType);
    }
}
