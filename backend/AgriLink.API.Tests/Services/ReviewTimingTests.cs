using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.DTOs.Officer;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Services;

/// <summary>How long advisories wait for an officer: overdue counts, the oldest wait and the
/// average review time shown on the officer and admin dashboards.</summary>
public class ReviewTimingTests
{
    private const int OfficerUserId = 20;
    private const int OtherOfficerUserId = 21;
    private static readonly DateTime Now = new(2026, 10, 13, 12, 0, 0, DateTimeKind.Utc);

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static int _nextId = 1;

    /// <summary>An issue in <paramref name="district"/> whose one advisory was drafted
    /// <paramref name="draftedHoursAgo"/> hours before <paramref name="now"/>.</summary>
    private static void AddIssue(
        AgriLinkDbContext db, string district, double draftedHoursAgo, AdvisoryStatus status = AdvisoryStatus.Draft,
        double? reviewedHoursAgo = null, int? reviewedBy = null, DateTime? now = null)
    {
        var at = now ?? Now;
        var id = Interlocked.Increment(ref _nextId);
        db.CropIssues.Add(new CropIssue
        {
            IssueId = id,
            FarmerProfileId = 1,
            Title = $"Issue {id}",
            Description = "d",
            CreatedAt = at.AddHours(-draftedHoursAgo),
            Crop = new Crop
            {
                CropId = id,
                CropType = "Rice",
                Field = new Field { FieldId = id, Name = "F", Farm = new Farm { FarmId = id, Name = "Farm", District = district, FarmerProfileId = 1 } },
            },
            Advisories =
            {
                new AIAdvisory
                {
                    AdvisoryId = id,
                    Status = status,
                    CreatedAt = at.AddHours(-draftedHoursAgo),
                    ReviewedAt = reviewedHoursAgo is null ? null : at.AddHours(-reviewedHoursAgo.Value),
                    ReviewedByFK = reviewedBy,
                },
            },
        });
    }

    [Fact]
    public async Task Summarise_CountsOnlyIssuesWaitingLongerThan48Hours_AndReportsTheOldestWait()
    {
        using var db = CreateDb();
        AddIssue(db, "Kandy", draftedHoursAgo: 2);
        AddIssue(db, "Kandy", draftedHoursAgo: 47.5);
        AddIssue(db, "Kandy", draftedHoursAgo: 49);
        AddIssue(db, "Kandy", draftedHoursAgo: 120, AdvisoryStatus.Preliminary);
        AddIssue(db, "Kandy", draftedHoursAgo: 300, AdvisoryStatus.Approved, reviewedHoursAgo: 290, reviewedBy: OfficerUserId);
        await db.SaveChangesAsync();

        var summary = await ReviewTiming.SummariseAsync(db.AIAdvisories.AwaitingReview(), db.AIAdvisories.Where(a => false), Now);

        Assert.Equal(2, summary.Overdue);
        Assert.Equal(120, summary.OldestPendingHours);
    }

    [Fact]
    public async Task Summarise_AveragesTheLast30DaysOfReviewsOnly()
    {
        using var db = CreateDb();
        AddIssue(db, "Kandy", draftedHoursAgo: 30, AdvisoryStatus.Approved, reviewedHoursAgo: 20, reviewedBy: OfficerUserId); // 10 h
        AddIssue(db, "Kandy", draftedHoursAgo: 100, AdvisoryStatus.Rejected, reviewedHoursAgo: 70, reviewedBy: OfficerUserId); // 30 h
        AddIssue(db, "Kandy", draftedHoursAgo: 40 * 24, AdvisoryStatus.Approved, reviewedHoursAgo: 35 * 24, reviewedBy: OfficerUserId); // too old
        await db.SaveChangesAsync();

        var summary = await ReviewTiming.SummariseAsync(
            db.AIAdvisories.AwaitingReview(), db.AIAdvisories.Where(a => a.ReviewedByFK == OfficerUserId), Now);

        Assert.Equal(20, summary.AverageReviewHours);
        Assert.Equal(2, summary.ReviewsInAverage);
    }

    [Fact]
    public async Task Summarise_NothingWaitingAndNothingReviewed_GivesNullsNotZeros()
    {
        using var db = CreateDb();

        var summary = await ReviewTiming.SummariseAsync(db.AIAdvisories.AwaitingReview(), db.AIAdvisories, Now);

        Assert.Equal(0, summary.Overdue);
        Assert.Null(summary.OldestPendingHours);
        Assert.Null(summary.AverageReviewHours);
        Assert.Equal(0, summary.ReviewsInAverage);
    }

    [Fact]
    public async Task OfficerMetrics_OverdueIsTheirDistrictOnly_AndTheAverageIsTheirOwnReviews()
    {
        using var db = CreateDb();
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Plant Protection" });
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Kandy" });
        var now = DateTime.UtcNow;
        AddIssue(db, "Kandy", draftedHoursAgo: 60, now: now);
        AddIssue(db, "Galle", draftedHoursAgo: 90, now: now);
        AddIssue(db, "Kandy", draftedHoursAgo: 10, AdvisoryStatus.Approved, reviewedHoursAgo: 6, reviewedBy: OfficerUserId, now: now);
        AddIssue(db, "Kandy", draftedHoursAgo: 50, AdvisoryStatus.Approved, reviewedHoursAgo: 2, reviewedBy: OtherOfficerUserId, now: now);
        await db.SaveChangesAsync();
        var controller = new OfficerController(db, new CurrentUserService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(OfficerUserId, "Officer") },
            },
        };

        var response = Assert.IsType<OfficerMetricsResponse>(Assert.IsType<OkObjectResult>((await controller.Metrics()).Result).Value);

        Assert.Equal(1, response.OverdueInDistrict);
        Assert.Equal(60, response.OldestPendingHours!.Value, precision: 0);
        Assert.Equal(4, response.AverageReviewHours!.Value, precision: 0);
        Assert.Equal(1, response.ReviewsInAverage);
        Assert.Equal(48, response.OverdueAfterHours);
    }

    [Fact]
    public async Task AdminMetrics_CountOverdueIssuesInEveryDistrict()
    {
        using var db = CreateDb();
        var now = DateTime.UtcNow;
        AddIssue(db, "Kandy", draftedHoursAgo: 60, now: now);
        AddIssue(db, "Galle", draftedHoursAgo: 90, now: now);
        AddIssue(db, "Galle", draftedHoursAgo: 5, now: now);
        AddIssue(db, "Kandy", draftedHoursAgo: 50, AdvisoryStatus.Approved, reviewedHoursAgo: 2, reviewedBy: OtherOfficerUserId, now: now);
        await db.SaveChangesAsync();
        var controller = new AdminController(null!, db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(1, "Admin") },
            },
        };

        var response = Assert.IsType<AdminMetricsResponse>(Assert.IsType<OkObjectResult>((await controller.Metrics()).Result).Value);

        Assert.Equal(2, response.IssuesOverdue);
        Assert.Equal(90, response.OldestPendingHours!.Value, precision: 0);
        Assert.Equal(48, response.AverageReviewHours!.Value, precision: 0);
    }
}
