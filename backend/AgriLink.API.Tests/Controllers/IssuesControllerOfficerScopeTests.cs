using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// GET /api/issues/pending used to return every district's Draft-advisory issues to any
/// officer, which disagreed with AgentOrchestrator.NotifyOfficersAsync only ever notifying
/// officers in the issue's own district. These tests cover the fix (scoped to the calling
/// officer's district; Admin stays unscoped) and the new GET /api/issues/reviewed queue.
/// </summary>
public class IssuesControllerOfficerScopeTests
{
    private const int KandyOfficerUserId = 20;
    private const int GalleOfficerUserId = 21;
    private const int AdminUserId = 22;
    private const int FarmerUserId = 10;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    /// <summary>One Draft issue in Kandy, one in Galle, and an officer assigned to each district.</summary>
    private static AgriLinkDbContext SeedTwoDistricts()
    {
        var db = CreateDb();

        db.Users.Add(new ApplicationUser { Id = FarmerUserId, UserName = "farmer@test.com", Email = "farmer@test.com", FullName = "Test Farmer" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });

        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension Services" });
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = KandyOfficerUserId, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 2, UserId = GalleOfficerUserId, DepartmentId = 1, District = "Galle" });

        db.Crops.AddRange(
            new Crop
            {
                CropId = 1,
                CropType = "Tea",
                Field = new Field { FieldId = 1, Name = "Field K", Farm = new Farm { FarmId = 1, Name = "Kandy Farm", District = "Kandy", FarmerProfileId = 1 } },
            },
            new Crop
            {
                CropId = 2,
                CropType = "Cinnamon",
                Field = new Field { FieldId = 2, Name = "Field G", Farm = new Farm { FarmId = 2, Name = "Galle Farm", District = "Galle", FarmerProfileId = 1 } },
            });

        db.CropIssues.AddRange(
            new CropIssue
            {
                IssueId = 1,
                CropId = 1,
                FarmerProfileId = 1,
                Title = "Kandy issue",
                Description = "In Kandy.",
                Severity = IssueSeverity.Medium,
                Status = IssueStatus.AwaitingReview,
                Advisories = { new AIAdvisory { AdvisoryId = 1, Status = AdvisoryStatus.Draft } },
            },
            new CropIssue
            {
                IssueId = 2,
                CropId = 2,
                FarmerProfileId = 1,
                Title = "Galle issue",
                Description = "In Galle.",
                Severity = IssueSeverity.Low,
                Status = IssueStatus.AwaitingReview,
                Advisories = { new AIAdvisory { AdvisoryId = 2, Status = AdvisoryStatus.Draft } },
            });

        db.SaveChanges();
        return db;
    }

    private static IssuesController CreateController(AgriLinkDbContext db, int actingUserId, string role) =>
        new(db, new CurrentUserService(db), Mock.Of<IAgentOrchestrator>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    [Fact]
    public async Task Pending_Officer_OnlySeesOwnDistrict()
    {
        var db = SeedTwoDistricts();
        var controller = CreateController(db, KandyOfficerUserId, "Officer");

        var result = await controller.Pending();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        var issue = Assert.Single(issues);
        Assert.Equal("Kandy issue", issue.Title);
    }

    [Fact]
    public async Task Pending_DifferentOfficer_SeesTheOtherDistrictOnly()
    {
        var db = SeedTwoDistricts();
        var controller = CreateController(db, GalleOfficerUserId, "Officer");

        var result = await controller.Pending();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        var issue = Assert.Single(issues);
        Assert.Equal("Galle issue", issue.Title);
    }

    [Fact]
    public async Task Pending_Admin_SeesEveryDistrict()
    {
        var db = SeedTwoDistricts();
        var controller = CreateController(db, AdminUserId, "Admin");

        var result = await controller.Pending();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, issues.Count());
    }

    [Fact]
    public async Task Reviewed_ReturnsOnlyIssuesThisOfficerReviewed()
    {
        var db = SeedTwoDistricts();
        // The Kandy officer reviews the Kandy issue's advisory; the Galle issue is untouched.
        var advisory = await db.AIAdvisories.FirstAsync(a => a.AdvisoryId == 1);
        advisory.Status = AdvisoryStatus.Approved;
        advisory.ReviewedByFK = KandyOfficerUserId;
        advisory.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var controller = CreateController(db, KandyOfficerUserId, "Officer");

        var result = await controller.Reviewed();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        var issue = Assert.Single(issues);
        Assert.Equal("Kandy issue", issue.Title);
    }

    [Fact]
    public async Task Reviewed_OfficerWhoReviewedNothing_ReturnsEmpty()
    {
        var db = SeedTwoDistricts();
        var controller = CreateController(db, GalleOfficerUserId, "Officer");

        var result = await controller.Reviewed();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Empty(issues);
    }
}
