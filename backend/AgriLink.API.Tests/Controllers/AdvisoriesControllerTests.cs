using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

public class AdvisoriesControllerTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AIAdvisory SeedDraftAdvisory(AgriLinkDbContext db)
    {
        // A full Crop -> Field -> Farm and FarmerProfile -> User chain is required here: EF Core
        // compiles Include() on a required navigation to an INNER JOIN, so a shortcut seed with
        // only the scalar FK ids set (no backing row) makes the whole advisory vanish from the
        // query instead of just missing a field — exactly what real referential integrity rules
        // out in production but nothing stops in an in-memory test database.
        db.Users.Add(new ApplicationUser { Id = 1, UserName = "farmer@test.com", Email = "farmer@test.com", FullName = "Test Farmer" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = 1, NIC = "1", District = "Kandy" });

        var issue = new CropIssue
        {
            IssueId = 1,
            CropId = 1,
            FarmerProfileId = 1,
            Crop = new Crop
            {
                CropId = 1,
                CropType = "Tomato",
                Variety = "Roma",
                Field = new Field
                {
                    FieldId = 1,
                    Name = "Field 1",
                    Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = 1 },
                },
            },
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
        new AuditLogService(db),
        Mock.Of<INotificationService>())
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

    [Fact]
    public async Task Approve_ReturnsFullIssueContextIncludingReporterAndReviewerNames()
    {
        using var db = CreateDb();
        db.Users.Add(new ApplicationUser { Id = 5, UserName = "officer@test.com", Email = "officer@test.com", FullName = "Officer Perera" });
        db.SaveChanges();
        var advisory = SeedDraftAdvisory(db);
        var controller = CreateController(db, officerUserId: 5);

        var result = await controller.Approve(advisory.AdvisoryId);

        var response = Assert.IsType<AgriLink.API.DTOs.Advisories.AdvisoryResponse>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Test Farmer", response.ReporterName);
        Assert.Equal("Officer Perera", response.ReviewedByName);
        Assert.Equal("Tomato", response.CropType);
        Assert.Equal("Kandy", response.District);
        Assert.Equal("Leaves turning yellow.", response.IssueDescription);
    }
}
