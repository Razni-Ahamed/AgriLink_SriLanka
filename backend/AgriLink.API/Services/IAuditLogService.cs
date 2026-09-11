namespace AgriLink.API.Services;

public interface IAuditLogService
{
    /// <summary>
    /// Tracks a new AuditLog row on the current DbContext. Deliberately does not call
    /// SaveChangesAsync itself: callers already persist their own changes at the end of
    /// the request, so the audit row commits in the very same transaction as the action
    /// it describes rather than costing an extra database round trip.
    /// </summary>
    void Record(int userId, string action, string entityName, int entityId, string? oldValue = null, string? newValue = null);
}
