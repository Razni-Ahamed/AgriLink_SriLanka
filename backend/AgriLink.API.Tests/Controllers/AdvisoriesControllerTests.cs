using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class AdvisoriesControllerTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AIAdvisory SeedDraftAdvisory(AgriLinkDbContext db)
    {
        var issue = new CropIssue
        {
            IssueId = 1,
            CropId = 1,
            FarmerProfileId = 1,
            Title = "Yellowing leaves",
            Description = "Leaves turning yellow.",
            Status = IssueStatus.AwaitingReview,
        };
        var advisory = new AIAdvisory
        {
            AdvisoryId = 1,
            IssueId = 1,
            Issue = issue,
            Status = AdvisoryStatus.Draft,
            RiskLevel = RiskLevel.Medium,
            Recommendation = "Apply nitrogen-rich fertiliser.",
            ConfidenceScore = 0.7f,
        };
        db.AIAdvisories.Add(advisory);
        db.SaveChanges();
        return advisory;
    }

    private static AdvisoriesController CreateController(AgriLinkDbContext db, int officerUserId) => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(officerUserId, "Officer") },
        },
    };

    [Fact]
    public async Task Approve_DraftAdvisory_RecordsAuditLogWithReviewer()
    {
        using var db = CreateDb();
        var advisory = SeedDraftAdvisory(db);
        var controller = CreateController(db, officerUserId: 5);

        var result = await controller.Approve(advisory.AdvisoryId);

        Assert.IsType<OkObjectResult>(result.Result);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == advisory.AdvisoryId && a.Action == "AdvisoryApproved");
        Assert.NotNull(auditLog);
        Assert.Equal(5, auditLog!.UserId);
        Assert.Equal("AIAdvisory", auditLog.EntityName);
        Assert.Equal(nameof(AdvisoryStatus.Draft), auditLog.OldValue);
        Assert.Equal(nameof(AdvisoryStatus.Approved), auditLog.NewValue);
    }

    [Fact]
    public async Task Reject_DraftAdvisory_RecordsAuditLogWithReviewer()
    {
        using var db = CreateDb();
        var advisory = SeedDraftAdvisory(db);
        var controller = CreateController(db, officerUserId: 7);

        var result = await controller.Reject(advisory.AdvisoryId);

        Assert.IsType<OkObjectResult>(result.Result);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == advisory.AdvisoryId && a.Action == "AdvisoryRejected");
        Assert.NotNull(auditLog);
        Assert.Equal(7, auditLog!.UserId);
        Assert.Equal(nameof(AdvisoryStatus.Rejected), auditLog.NewValue);
    }
}
