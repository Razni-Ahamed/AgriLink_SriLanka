using AgriLink.API.Data;
using AgriLink.API.DTOs.PurchaseRequests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/purchase-requests")]
[Authorize]
public class PurchaseRequestsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public PurchaseRequestsController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpPost]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<PurchaseRequestResponse>> Create(CreatePurchaseRequestRequest request)
    {
        var buyerProfileId = await _currentUser.GetBuyerProfileIdAsync(User);
        if (buyerProfileId is null)
        {
            return Forbid();
        }

        var listing = await _db.HarvestListings.FirstOrDefaultAsync(h => h.HarvestId == request.HarvestId);
        if (listing is null)
        {
            return NotFound(new { message = "Harvest listing not found." });
        }

        if (listing.Status != HarvestStatus.Active)
        {
            return BadRequest(new { message = "This harvest listing is not active." });
        }

        if (request.RequestedQuantity > listing.AvailableQuantity)
        {
            return BadRequest(new { message = "Requested quantity exceeds available quantity." });
        }

        var purchaseRequest = new PurchaseRequest
        {
            HarvestId = request.HarvestId,
            BuyerProfileId = buyerProfileId.Value,
            RequestedQuantity = request.RequestedQuantity,
            Message = request.Message ?? string.Empty,
            Status = PurchaseRequestStatus.Pending,
        };

        _db.PurchaseRequests.Add(purchaseRequest);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToResponse(purchaseRequest));
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<PurchaseRequestResponse>>> Mine()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var requests = await _db.PurchaseRequests
            .Include(r => r.Harvest)
            .Where(r => r.Harvest.FarmerProfileId == farmerProfileId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(requests.Select(ToResponse));
    }

    [HttpPost("{id:int}/respond")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<PurchaseRequestResponse>> Respond(int id, RespondPurchaseRequestRequest request)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var purchaseRequest = await _db.PurchaseRequests
            .Include(r => r.Harvest)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (purchaseRequest is null)
        {
            return NotFound();
        }

        if (purchaseRequest.Harvest.FarmerProfileId != farmerProfileId)
        {
            return Forbid();
        }

        if (purchaseRequest.Status != PurchaseRequestStatus.Pending)
        {
            return BadRequest(new { message = "Only pending requests can be responded to." });
        }

        var action = request.Action.Trim().ToLowerInvariant();
        if (action != "accept" && action != "decline")
        {
            return BadRequest(new { message = "Action must be 'accept' or 'decline'." });
        }

        if (action == "decline")
        {
            purchaseRequest.Status = PurchaseRequestStatus.Declined;
            await _db.SaveChangesAsync();
            return Ok(ToResponse(purchaseRequest));
        }

        var listing = purchaseRequest.Harvest;
        if (purchaseRequest.RequestedQuantity > listing.AvailableQuantity)
        {
            return BadRequest(new { message = "Not enough available quantity to accept this request." });
        }

        listing.AvailableQuantity -= purchaseRequest.RequestedQuantity;
        if (listing.AvailableQuantity <= 0)
        {
            listing.Status = HarvestStatus.Sold;
        }

        purchaseRequest.Status = PurchaseRequestStatus.Accepted;

        var order = new Order
        {
            RequestId = purchaseRequest.RequestId,
            FarmerProfileId = farmerProfileId.Value,
            BuyerProfileId = purchaseRequest.BuyerProfileId,
            TotalQuantity = purchaseRequest.RequestedQuantity,
            TotalAmount = purchaseRequest.RequestedQuantity * listing.PricePerUnit,
            Status = OrderStatus.Confirmed,
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        return Ok(ToResponse(purchaseRequest));
    }

    private static PurchaseRequestResponse ToResponse(PurchaseRequest request) => new()
    {
        RequestId = request.RequestId,
        HarvestId = request.HarvestId,
        BuyerProfileId = request.BuyerProfileId,
        RequestedQuantity = request.RequestedQuantity,
        Message = request.Message,
        Status = request.Status.ToString(),
        CreatedAt = request.CreatedAt,
    };
}
