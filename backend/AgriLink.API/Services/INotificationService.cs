namespace AgriLink.API.Services;

public interface INotificationService
{
    Task NotifyAsync(int userId, string title, string message);
}
