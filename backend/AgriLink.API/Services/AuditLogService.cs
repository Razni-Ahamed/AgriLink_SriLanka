using AgriLink.API.Data;
using AgriLink.API.Models;

namespace AgriLink.API.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AgriLinkDbContext _db;

    public AuditLogService(AgriLinkDbContext db)
    {
        _db = db;
    }

    public void Record(int userId, string action, string entityName, int entityId, string? oldValue = null, string? newValue = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            OldValue = oldValue,
            NewValue = newValue,
        });
    }
}
