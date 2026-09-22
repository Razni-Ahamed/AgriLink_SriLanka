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

public class HarvestsControllerTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static HarvestListing SeedListing(AgriLinkDbContext db, int farmerProfileId, int farmerUserId)
    {
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = farmerProfileId, UserId = farmerUserId, NIC = "1", District = "Kandy" });
        var crop = new Crop
        {
            CropId = 1,
            CropType = "Tomato",
            Variety = "Roma",
            Field = new Field
            {
                FieldId = 1,
                Name = "Field 1",
                Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = farmerProfileId },
            },
        };
        var listing = new HarvestListing
        {
            HarvestId = 1,
            FarmerProfileId = farmerProfileId,
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
        db.SaveChanges();
        return listing;
    }

    private static HarvestsController CreateController(AgriLinkDbContext db, int actingUserId, string role) => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db),
        new NotificationService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
        },
    };

    [Fact]
    public async Task Update_OwningFarmer_Succeeds()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        var controller = CreateController(db, actingUserId: 10, role: "Farmer");

        var result = await controller.Update(listing.HarvestId, new UpdateHarvestListingRequest { PricePerUnit = 65 });

        var response = Assert.IsType<HarvestListingResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(65, response.PricePerUnit);
    }

    [Fact]
    public async Task Update_NonOwningFarmer_IsForbidden()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 2, UserId = 20, NIC = "2", District = "Galle" });
        db.SaveChanges();
        var controller = CreateController(db, actingUserId: 20, role: "Farmer");

        var result = await controller.Update(listing.HarvestId, new UpdateHarvestListingRequest { PricePerUnit = 999 });

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task Update_Admin_BypassesOwnershipAndRecordsAudit()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        var controller = CreateController(db, actingUserId: 999, role: "Admin");

        var result = await controller.Update(listing.HarvestId, new UpdateHarvestListingRequest { Status = HarvestStatus.Cancelled });

        var response = Assert.IsType<HarvestListingResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(nameof(HarvestStatus.Cancelled), response.Status);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == listing.HarvestId && a.Action == "HarvestListingUpdatedByAdmin");
        Assert.NotNull(auditLog);
        Assert.Equal(999, auditLog!.UserId);
        Assert.Equal(nameof(HarvestStatus.Active), auditLog.OldValue);
        Assert.Equal(nameof(HarvestStatus.Cancelled), auditLog.NewValue);
    }

    [Fact]
    public async Task Mine_ReturnsOnlyTheCallingFarmersOwnListingsRegardlessOfStatus()
    {
        using var db = CreateDb();
        var ownListing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        ownListing.Status = HarvestStatus.Sold;
        db.SaveChanges();

        // A second farmer in the same district — "mine" must not leak into their listings the
        // way the frontend's earlier district-based filter did.
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 2, UserId = 20, NIC = "2", District = "Kandy" });
        var otherCrop = new Crop
        {
            CropId = 2,
            CropType = "Rice",
            Field = new Field { FieldId = 2, Name = "Field 2", Farm = new Farm { FarmId = 2, Name = "Farm 2", District = "Kandy", FarmerProfileId = 2 } },
        };
        db.HarvestListings.Add(new HarvestListing
        {
            HarvestId = 2,
            FarmerProfileId = 2,
            CropId = 2,
            Crop = otherCrop,
            Quantity = 50,
            AvailableQuantity = 50,
            HarvestDate = DateOnly.FromDateTime(DateTime.UtcNow),
            PricePerUnit = 30,
            Location = "Kandy Town",
            Status = HarvestStatus.Active,
        });
        db.SaveChanges();

        var controller = CreateController(db, actingUserId: 10, role: "Farmer");

        var result = await controller.Mine();

        var listings = Assert.IsType<OkObjectResult>(result.Result).Value as IEnumerable<HarvestListingResponse>;
        var listingList = listings!.ToList();
        var onlyListing = Assert.Single(listingList);
        Assert.Equal(ownListing.HarvestId, onlyListing.HarvestId);
        Assert.Equal(nameof(HarvestStatus.Sold), onlyListing.Status);
    }

    [Fact]
    public async Task Update_ReopeningASoldOutListing_IsRejected()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        listing.AvailableQuantity = 0;
        listing.Status = HarvestStatus.Sold;
        db.SaveChanges();

        var result = await CreateController(db, actingUserId: 10, role: "Farmer")
            .Update(listing.HarvestId, new UpdateHarvestListingRequest { Status = HarvestStatus.Active });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(HarvestStatus.Sold, (await db.HarvestListings.SingleAsync()).Status);
    }

    [Fact]
    public async Task Update_NonPositivePrice_IsRejected()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);

        var result = await CreateController(db, actingUserId: 10, role: "Farmer")
            .Update(listing.HarvestId, new UpdateHarvestListingRequest { PricePerUnit = 0 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private static PurchaseRequest AddPendingRequest(AgriLinkDbContext db, HarvestListing listing, int requestId, int buyerUserId)
    {
        db.Users.Add(new ApplicationUser { Id = buyerUserId, UserName = $"buyer{buyerUserId}@agrilink.lk", Email = $"buyer{buyerUserId}@agrilink.lk", FullName = $"Buyer {buyerUserId}" });
        db.BuyerProfiles.Add(new BuyerProfile { BuyerProfileId = requestId, UserId = buyerUserId, BusinessName = "Buyer Co", District = "Colombo" });
        var request = new PurchaseRequest
        {
            RequestId = requestId,
            HarvestId = listing.HarvestId,
            Harvest = listing,
            BuyerProfileId = requestId,
            RequestedQuantity = 10,
            Status = PurchaseRequestStatus.Pending,
        };
        db.PurchaseRequests.Add(request);
        db.SaveChanges();
        return request;
    }

    [Fact]
    public async Task Update_StatusChangedToSold_CancelsPendingRequestsAndNotifiesTheirBuyers()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        var request = AddPendingRequest(db, listing, requestId: 1, buyerUserId: 20);

        var result = await CreateController(db, actingUserId: 10, role: "Farmer")
            .Update(listing.HarvestId, new UpdateHarvestListingRequest { Status = HarvestStatus.Sold });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(PurchaseRequestStatus.Cancelled, (await db.PurchaseRequests.SingleAsync(r => r.RequestId == request.RequestId)).Status);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "PurchaseRequestAutoCancelled" && a.EntityId == request.RequestId);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == 20 && n.Title == "Purchase request closed");
    }

    [Fact]
    public async Task Update_StatusChangedToCancelled_CancelsPendingRequests()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        var request = AddPendingRequest(db, listing, requestId: 1, buyerUserId: 20);

        var result = await CreateController(db, actingUserId: 10, role: "Farmer")
            .Update(listing.HarvestId, new UpdateHarvestListingRequest { Status = HarvestStatus.Cancelled });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(PurchaseRequestStatus.Cancelled, (await db.PurchaseRequests.SingleAsync(r => r.RequestId == request.RequestId)).Status);
    }

    [Fact]
    public async Task Update_StatusStaysActive_LeavesPendingRequestsAlone()
    {
        using var db = CreateDb();
        var listing = SeedListing(db, farmerProfileId: 1, farmerUserId: 10);
        var request = AddPendingRequest(db, listing, requestId: 1, buyerUserId: 20);

        var result = await CreateController(db, actingUserId: 10, role: "Farmer")
            .Update(listing.HarvestId, new UpdateHarvestListingRequest { PricePerUnit = 55 });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(PurchaseRequestStatus.Pending, (await db.PurchaseRequests.SingleAsync(r => r.RequestId == request.RequestId)).Status);
        Assert.Empty(await db.Notifications.ToListAsync());
    }
}
