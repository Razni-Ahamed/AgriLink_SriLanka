using AgriLink.API.Data;
using AgriLink.API.Models;

namespace AgriLink.API.Services;

public class NotificationService : INotificationService
{
    private readonly AgriLinkDbContext _db;

    public NotificationService(AgriLinkDbContext db)
    {
        _db = db;
    }

    public async Task NotifyAsync(int userId, string title, string message)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
        });

        await _db.SaveChangesAsync();
    }
}
