using AgriLink.API.Data;
using AgriLink.API.Services;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Services;

public class AuditLogServiceTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Record_TracksAnAuditLogRow_ThatPersistsOnTheCallersNextSaveChanges()
    {
        using var db = CreateDb();
        var service = new AuditLogService(db);

        service.Record(userId: 7, action: "UserCreated", entityName: "User", entityId: 42, oldValue: null, newValue: "Officer");
        await db.SaveChangesAsync();

        var log = Assert.Single(db.AuditLogs);
        Assert.Equal(7, log.UserId);
        Assert.Equal("UserCreated", log.Action);
        Assert.Equal("User", log.EntityName);
        Assert.Equal(42, log.EntityId);
        Assert.Null(log.OldValue);
        Assert.Equal("Officer", log.NewValue);
    }

    [Fact]
    public void Record_DoesNotSaveByItself()
    {
        // Callers piggyback the audit row on their own SaveChangesAsync so it commits in the
        // same transaction as the action it describes; Record must only track, never save.
        using var db = CreateDb();
        var service = new AuditLogService(db);

        service.Record(userId: 1, action: "RoleChanged", entityName: "User", entityId: 1, oldValue: "Officer", newValue: "Buyer");

        Assert.Empty(db.AuditLogs);
    }
}
