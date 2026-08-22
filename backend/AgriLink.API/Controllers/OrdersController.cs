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

    public OrdersController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Buyer,Farmer")]
    public async Task<ActionResult<List<OrderResponse>>> Mine()
    {
        var query = _db.Orders.AsQueryable();

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
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == id);
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
    };
}
