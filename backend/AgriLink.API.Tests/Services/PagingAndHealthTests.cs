using System.ComponentModel.DataAnnotations;
using AgriLink.API.Common;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Notifications;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AgriLink.API.Tests.Services;

public class PagingAndHealthTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Theory]
    [InlineData(int.MaxValue, 100)]
    [InlineData(int.MaxValue, 20)]
    [InlineData(int.MaxValue, int.MaxValue)]
    public async Task ToPagedResponse_HugePage_IsCappedSoTheOffsetCannotOverflow(int page, int pageSize)
    {
        using var db = CreateDb();
        db.Departments.Add(new Department { Name = "Extension" });
        await db.SaveChangesAsync();

        var result = await db.Departments.OrderBy(d => d.Name).ToPagedResponseAsync(page, pageSize);

        // (page - 1) * pageSize must stay a non-negative int, or PostgreSQL rejects the OFFSET (500).
        Assert.True((long)(result.Page - 1) * result.PageSize <= int.MaxValue);
        Assert.Empty(result.Items);
        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task ToPagedResponse_OrdinaryPage_IsUnchanged()
    {
        using var db = CreateDb();
        db.Departments.AddRange(new Department { Name = "A" }, new Department { Name = "B" }, new Department { Name = "C" });
        await db.SaveChangesAsync();

        var result = await db.Departments.OrderBy(d => d.Name).ToPagedResponseAsync(2, 2);

        Assert.Equal(2, result.Page);
        Assert.Equal("C", Assert.Single(result.Items).Name);
        Assert.Equal(2, result.TotalPages);
    }

    [Fact]
    public async Task DatabaseHealthCheck_ReachableDatabase_IsHealthy()
    {
        using var db = CreateDb();

        var result = await new DatabaseHealthCheck(db).CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Healthy, result.Status);
    }

    [Theory]
    [InlineData("", "Message", false)]
    [InlineData("   ", "Message", false)]
    [InlineData("Title", "", false)]
    [InlineData("Title", "Message", true)]
    public void SendNotificationRequest_RequiresTitleAndMessage(string title, string message, bool valid)
    {
        var request = new SendNotificationRequest { UserId = 1, Title = title, Message = message };

        Assert.Equal(valid, Validator.TryValidateObject(request, new ValidationContext(request), null, validateAllProperties: true));
    }

    [Fact]
    public void SendNotificationRequest_TitleLongerThanItsColumn_IsInvalid()
    {
        // Notifications.Title is varchar(150); a longer title used to reach the database as a 500.
        var request = new SendNotificationRequest { UserId = 1, Title = new string('x', 151), Message = "Message" };

        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), null, validateAllProperties: true));
    }
}
