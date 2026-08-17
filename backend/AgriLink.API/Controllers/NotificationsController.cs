using AgriLink.API.Data;
using AgriLink.API.DTOs.Notifications;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notificationService;

    public NotificationsController(AgriLinkDbContext db, ICurrentUserService currentUser, INotificationService notificationService)
    {
        _db = db;
        _currentUser = currentUser;
        _notificationService = notificationService;
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<NotificationResponse>>> Mine()
    {
        var userId = _currentUser.GetUserId(User);

        var notifications = await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return Ok(notifications.Select(ToResponse));
    }

    [HttpPut("{id}/read")]
    public async Task<ActionResult<NotificationResponse>> MarkRead(int id)
    {
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.NotificationId == id);
        if (notification is null)
        {
            return NotFound(new { message = "Notification not found." });
        }

        var userId = _currentUser.GetUserId(User);
        if (notification.UserId != userId && !_currentUser.IsAdmin(User))
        {
            return Forbid();
        }

        notification.IsRead = true;
        await _db.SaveChangesAsync();

        return Ok(ToResponse(notification));
    }

    [HttpPost("send")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Send(SendNotificationRequest request)
    {
        var userExists = await _db.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
        {
            return NotFound(new { message = "User not found." });
        }

        await _notificationService.NotifyAsync(request.UserId, request.Title, request.Message);

        return StatusCode(StatusCodes.Status201Created);
    }

    private static NotificationResponse ToResponse(Notification notification) => new()
    {
        NotificationId = notification.NotificationId,
        Title = notification.Title,
        Message = notification.Message,
        IsRead = notification.IsRead,
        CreatedAt = notification.CreatedAt,
    };
}
