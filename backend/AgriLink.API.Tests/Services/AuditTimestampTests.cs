using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Services;

public class AuditTimestampTests
{
    private static AgriLinkDbContext CreateDb(string name) =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>().UseInMemoryDatabase(name).Options);

    [Fact]
    public async Task ANewRecord_HasCreatedAt_ButNoUpdatedAt()
    {
        var name = Guid.NewGuid().ToString();
        await using (var db = CreateDb(name))
        {
            db.Departments.Add(new Department { Name = "Extension" });
            await db.SaveChangesAsync();
        }

        await using var check = CreateDb(name);
        var saved = await check.Departments.SingleAsync();
        Assert.True(saved.CreatedAt > DateTime.UtcNow.AddMinutes(-1));
        Assert.Null(saved.UpdatedAt);
    }

    [Fact]
    public async Task ChangingARecord_StampsUpdatedAt_AndLeavesCreatedAtAlone()
    {
        var name = Guid.NewGuid().ToString();
        var created = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
        await using (var db = CreateDb(name))
        {
            db.Departments.Add(new Department { Name = "Extension", CreatedAt = created });
            db.Departments.Add(new Department { Name = "Research", CreatedAt = created });
            await db.SaveChangesAsync();
        }

        var before = DateTime.UtcNow;
        await using (var db = CreateDb(name))
        {
            (await db.Departments.SingleAsync(d => d.Name == "Extension")).Name = "Extension Services";
            await db.SaveChangesAsync();
        }

        await using var check = CreateDb(name);
        var changed = await check.Departments.SingleAsync(d => d.Name == "Extension Services");
        var untouched = await check.Departments.SingleAsync(d => d.Name == "Research");
        Assert.True(changed.UpdatedAt >= before);
        Assert.Equal(created, changed.CreatedAt);
        Assert.Null(untouched.UpdatedAt);
    }

    [Fact]
    public void TheSynchronousSave_StampsUpdatedAtToo()
    {
        using var db = CreateDb(Guid.NewGuid().ToString());
        var farm = new Farm { Name = "Hill", District = "Kandy", FarmerProfileId = 1, Area = 2 };
        db.Farms.Add(farm);
        db.SaveChanges();

        farm.Area = 3;
        db.SaveChanges();

        Assert.NotNull(farm.UpdatedAt);
    }
}
