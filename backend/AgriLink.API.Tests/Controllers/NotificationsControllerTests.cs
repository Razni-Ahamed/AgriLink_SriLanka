using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Notifications;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class NotificationsControllerTests
{
    private const int UserId = 10;
    private const int OtherUserId = 20;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static NotificationsController CreateController(AgriLinkDbContext db, int actingUserId, string role = "Farmer") => new(
        db,
        new CurrentUserService(db),
        new NotificationService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
        },
    };

    private static void SeedNotifications(AgriLinkDbContext db, int userId, int unreadCount, int readCount)
    {
        // No explicit NotificationId — InMemory auto-generates one, so seeding the same user (or
        // different users) across several calls never collides on the primary key.
        var baseTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < unreadCount; i++)
        {
            db.Notifications.Add(new Notification { UserId = userId, Title = $"Unread {i}", Message = "m", IsRead = false, CreatedAt = baseTime.AddMinutes(i) });
        }
        for (var i = 0; i < readCount; i++)
        {
            db.Notifications.Add(new Notification { UserId = userId, Title = $"Read {i}", Message = "m", IsRead = true, CreatedAt = baseTime.AddMinutes(i) });
        }
        db.SaveChanges();
    }

    [Fact]
    public async Task Mine_PagesCorrectly()
    {
        using var db = CreateDb();
        SeedNotifications(db, UserId, unreadCount: 3, readCount: 12);
        var controller = CreateController(db, UserId);

        var result = Assert.IsType<PagedResponse<NotificationResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: 1, pageSize: 5)).Result).Value);

        Assert.Equal(15, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal(5, result.Items.Count);
    }

    [Fact]
    public async Task Mine_OnlyReturnsTheCallingUsersOwnNotifications()
    {
        using var db = CreateDb();
        SeedNotifications(db, UserId, unreadCount: 2, readCount: 0);
        SeedNotifications(db, OtherUserId, unreadCount: 5, readCount: 0);
        var controller = CreateController(db, UserId);

        var result = Assert.IsType<PagedResponse<NotificationResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: 1, pageSize: 20)).Result).Value);

        Assert.Equal(2, result.TotalCount);
    }

    [Fact]
    public async Task UnreadCount_ReturnsOnlyTheCallingUsersUnreadCount()
    {
        using var db = CreateDb();
        SeedNotifications(db, UserId, unreadCount: 4, readCount: 6);
        SeedNotifications(db, OtherUserId, unreadCount: 9, readCount: 0);
        var controller = CreateController(db, UserId);

        var result = Assert.IsType<NotificationUnreadCountResponse>(
            Assert.IsType<OkObjectResult>((await controller.UnreadCount(CancellationToken.None)).Result).Value);

        Assert.Equal(4, result.Count);
    }

    [Fact]
    public async Task MarkAllRead_MarksOnlyTheCallingUsersUnreadNotifications()
    {
        using var db = CreateDb();
        SeedNotifications(db, UserId, unreadCount: 3, readCount: 1);
        SeedNotifications(db, OtherUserId, unreadCount: 2, readCount: 0);
        var controller = CreateController(db, UserId);

        var result = await controller.MarkAllRead(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.True((await db.Notifications.Where(n => n.UserId == UserId).ToListAsync()).All(n => n.IsRead));
        // The other user's unread notifications must be untouched.
        Assert.Equal(2, await db.Notifications.CountAsync(n => n.UserId == OtherUserId && !n.IsRead));
    }

    [Fact]
    public async Task MarkAllRead_NoUnreadNotifications_StillSucceeds()
    {
        using var db = CreateDb();
        SeedNotifications(db, UserId, unreadCount: 0, readCount: 3);
        var controller = CreateController(db, UserId);

        var result = await controller.MarkAllRead(CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
    }
}
