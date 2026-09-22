using AgriLink.API.Data;
using AgriLink.API.DTOs.Orders;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly INotificationService _notifications;

    public OrdersController(
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        INotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _notifications = notifications;
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Buyer,Farmer")]
    public async Task<ActionResult<List<OrderResponse>>> Mine()
    {
        var query = WithDetails(_db.Orders);

        if (User.IsInRole("Buyer"))
        {
            var buyerProfileId = await _currentUser.GetBuyerProfileIdAsync(User);
            if (buyerProfileId is null)
            {
                return Forbid();
            }
            query = query.Where(o => o.BuyerProfileId == buyerProfileId);
        }
        else
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null)
            {
                return Forbid();
            }
            query = query.Where(o => o.FarmerProfileId == farmerProfileId);
        }

        var orders = await query.OrderByDescending(o => o.OrderDate).ToListAsync();
        return Ok(orders.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderResponse>> GetById(int id)
    {
        var order = await WithDetails(_db.Orders).FirstOrDefaultAsync(o => o.OrderId == id);
        if (order is null)
        {
            return NotFound();
        }

        if (!_currentUser.IsAdmin(User))
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            var buyerProfileId = await _currentUser.GetBuyerProfileIdAsync(User);
            if (order.FarmerProfileId != farmerProfileId && order.BuyerProfileId != buyerProfileId)
            {
                return Forbid();
            }
        }

        return Ok(ToResponse(order));
    }

    /// <summary>
    /// Either party marks a confirmed order as delivered. Until this existed nothing ever moved an
    /// order past Confirmed, so AdminController.Metrics' "sold this month" (Completed orders) was
    /// always zero.
    /// </summary>
    [HttpPost("{id:int}/complete")]
    [Authorize(Roles = "Buyer,Farmer")]
    public Task<ActionResult<OrderResponse>> Complete(int id) => Transition(id, OrderStatus.Completed);

    /// <summary>
    /// Either party calls off a confirmed order. The quantity goes back on the listing, which is
    /// reopened if accepting this order had sold it out.
    /// </summary>
    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Buyer,Farmer")]
    public Task<ActionResult<OrderResponse>> Cancel(int id) => Transition(id, OrderStatus.Cancelled);

    private async Task<ActionResult<OrderResponse>> Transition(int id, OrderStatus newStatus)
    {
        var order = await WithDetails(_db.Orders).FirstOrDefaultAsync(o => o.OrderId == id);
        if (order is null)
        {
            return NotFound();
        }

        var userId = _currentUser.GetUserId(User);
        var isFarmer = order.FarmerProfile.UserId == userId;
        if (!isFarmer && order.BuyerProfile.UserId != userId)
        {
            return Forbid();
        }

        if (order.Status != OrderStatus.Confirmed)
        {
            return BadRequest(new { message = "Only confirmed orders can be completed or cancelled." });
        }

        order.Status = newStatus;
        if (newStatus == OrderStatus.Completed)
        {
            order.CompletedAt = DateTime.UtcNow;
        }
        else
        {
            var listing = order.Request.Harvest;
            listing.AvailableQuantity += order.TotalQuantity;
            if (listing.Status == HarvestStatus.Sold && listing.AvailableQuantity > 0)
            {
                listing.Status = HarvestStatus.Active;
            }
        }

        _auditLog.Record(
            userId,
            newStatus == OrderStatus.Completed ? "OrderCompleted" : "OrderCancelled",
            "Order",
            order.OrderId,
            OrderStatus.Confirmed.ToString(),
            newStatus.ToString());
        await _db.SaveChangesAsync();

        var counterpartUserId = isFarmer ? order.BuyerProfile.UserId : order.FarmerProfile.UserId;
        var crop = order.Request.Harvest.Crop.CropType;
        await _notifications.NotifyAsync(
            counterpartUserId,
            newStatus == OrderStatus.Completed ? $"Order #{order.OrderId} completed" : $"Order #{order.OrderId} cancelled",
            newStatus == OrderStatus.Completed
                ? $"Your order for {order.TotalQuantity:0.##} kg of {crop} was marked as completed."
                : $"Your order for {order.TotalQuantity:0.##} kg of {crop} was cancelled.");

        return Ok(ToResponse(order));
    }

    /// <summary>
    /// The navigations ToResponse needs to fill in contact and listing details — one place so
    /// Mine/GetById/Transition project the same shape instead of drifting apart, and so the
    /// buyer/farmer names, districts and the listing's crop/price are each a single joined
    /// query rather than a per-order round trip.
    /// </summary>
    private static IQueryable<Order> WithDetails(IQueryable<Order> query) => query
        .Include(o => o.Request).ThenInclude(r => r.Harvest).ThenInclude(h => h.Crop)
        .Include(o => o.FarmerProfile).ThenInclude(fp => fp.User)
        .Include(o => o.BuyerProfile).ThenInclude(bp => bp.User);

    private static OrderResponse ToResponse(Order order) => new()
    {
        OrderId = order.OrderId,
        RequestId = order.RequestId,
        FarmerProfileId = order.FarmerProfileId,
        BuyerProfileId = order.BuyerProfileId,
        TotalQuantity = order.TotalQuantity,
        TotalAmount = order.TotalAmount,
        Status = order.Status.ToString(),
        OrderDate = order.OrderDate,
        CompletedAt = order.CompletedAt,
        FarmerName = order.FarmerProfile.User.FullName,
        FarmerPhone = order.FarmerProfile.PhoneNumber,
        FarmerEmail = order.FarmerProfile.User.Email ?? string.Empty,
        FarmerDistrict = order.FarmerProfile.District,
        BuyerName = order.BuyerProfile.User.FullName,
        BuyerBusinessName = order.BuyerProfile.BusinessName,
        BuyerPhone = order.BuyerProfile.BusinessPhone,
        BuyerEmail = order.BuyerProfile.User.Email ?? string.Empty,
        BuyerDistrict = order.BuyerProfile.District,
        CropType = order.Request.Harvest.Crop.CropType,
        PricePerUnit = order.Request.Harvest.PricePerUnit,
        HarvestLocation = order.Request.Harvest.Location,
    };
}
