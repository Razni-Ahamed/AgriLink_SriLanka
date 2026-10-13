namespace AgriLink.API.Services;

public interface INotificationService
{
    /// <summary>Adds the notification and saves it straight away.</summary>
    Task NotifyAsync(int userId, string title, string message);

    /// <summary>
    /// Adds the notification without saving it, so it is written by the caller's own
    /// SaveChangesAsync together with the change it is about — or not at all if that save fails.
    /// </summary>
    void Add(int userId, string title, string message);
}
