using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services.Sms;

namespace AgriLink.API.Services;

public class NotificationService : INotificationService
{
    private readonly AgriLinkDbContext _db;
    private readonly ISmsAlertQueue? _sms;

    public NotificationService(AgriLinkDbContext db, ISmsAlertQueue? sms = null)
    {
        _db = db;
        _sms = sms;
    }

    public async Task NotifyAsync(int userId, string title, string message)
    {
        Add(userId, title, message);
        await _db.SaveChangesAsync();
    }

    public void Add(int userId, string title, string message)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
        });
    }

    public void QueueSms(int userId, SmsAlert alert) => _sms?.Enqueue(userId, alert);
}
