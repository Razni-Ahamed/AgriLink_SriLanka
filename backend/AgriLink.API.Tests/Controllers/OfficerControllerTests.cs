using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Officer;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class OfficerControllerTests
{
    private const int OfficerUserId = 20;
    private const int OtherOfficerUserId = 21;
    private const int FarmerUserId = 10;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static OfficerController CreateController(AgriLinkDbContext db, int actingUserId) => new(
        db, new CurrentUserService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, "Officer") },
        },
    };

    [Fact]
    public async Task Metrics_NoOfficerProfile_ReturnsNotFound()
    {
        var db = CreateDb();
        var controller = CreateController(db, actingUserId: 999);

        var result = await controller.Metrics();

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Metrics_ReturnsDistrictDepartmentAndCounts()
    {
        var db = CreateDb();

        db.Users.Add(new ApplicationUser { Id = FarmerUserId, UserName = "f@test.com", Email = "f@test.com", FullName = "Farmer" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });

        db.Departments.Add(new Department { DepartmentId = 1, Name = "Plant Protection" });
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 2, UserId = OtherOfficerUserId, DepartmentId = 1, District = "Kandy" });

        // Two crops so two farms/fields exist to hang issues off, both in Kandy.
        db.Crops.AddRange(
            new Crop { CropId = 1, CropType = "Tea", Field = new Field { FieldId = 1, Name = "F1", Farm = new Farm { FarmId = 1, Name = "Farm1", District = "Kandy", FarmerProfileId = 1 } } },
            new Crop { CropId = 2, CropType = "Rubber", Field = new Field { FieldId = 2, Name = "F2", Farm = new Farm { FarmId = 2, Name = "Farm2", District = "Kandy", FarmerProfileId = 1 } } },
            new Crop { CropId = 3, CropType = "Coconut", Field = new Field { FieldId = 3, Name = "F3", Farm = new Farm { FarmId = 3, Name = "Farm3", District = "Galle", FarmerProfileId = 1 } } });

        db.CropIssues.AddRange(
            // Still pending, in this officer's district — counted in PendingInDistrict.
            new CropIssue
            {
                IssueId = 1, CropId = 1, FarmerProfileId = 1, Title = "Pending in Kandy",
                Description = "d", Status = IssueStatus.AwaitingReview,
                Advisories = { new AIAdvisory { AdvisoryId = 1, Status = AdvisoryStatus.Draft } },
            },
            // Still pending, but a different district — must NOT be counted.
            new CropIssue
            {
                IssueId = 2, CropId = 3, FarmerProfileId = 1, Title = "Pending in Galle",
                Description = "d", Status = IssueStatus.AwaitingReview,
                Advisories = { new AIAdvisory { AdvisoryId = 2, Status = AdvisoryStatus.Draft } },
            },
            // Reviewed by this officer today, approved.
            new CropIssue
            {
                IssueId = 3, CropId = 2, FarmerProfileId = 1, Title = "Approved today",
                Description = "d", Status = IssueStatus.Resolved,
                Advisories = { new AIAdvisory
                {
                    AdvisoryId = 3, Status = AdvisoryStatus.Approved,
                    ReviewedByFK = OfficerUserId, ReviewedAt = DateTime.UtcNow,
                } },
            },
            // Reviewed by this officer previously (not today), rejected.
            new CropIssue
            {
                IssueId = 4, CropId = 2, FarmerProfileId = 1, Title = "Rejected earlier",
                Description = "d", Status = IssueStatus.Rejected,
                Advisories = { new AIAdvisory
                {
                    AdvisoryId = 4, Status = AdvisoryStatus.Rejected,
                    ReviewedByFK = OfficerUserId, ReviewedAt = DateTime.UtcNow.AddDays(-3),
                } },
            },
            // Reviewed by a *different* officer — must not count toward this officer's totals.
            new CropIssue
            {
                IssueId = 5, CropId = 2, FarmerProfileId = 1, Title = "Reviewed by someone else",
                Description = "d", Status = IssueStatus.Resolved,
                Advisories = { new AIAdvisory
                {
                    AdvisoryId = 5, Status = AdvisoryStatus.Approved,
                    ReviewedByFK = OtherOfficerUserId, ReviewedAt = DateTime.UtcNow,
                } },
            });

        await db.SaveChangesAsync();

        var controller = CreateController(db, OfficerUserId);

        var result = await controller.Metrics();

        var response = Assert.IsType<OfficerMetricsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Kandy", response.District);
        Assert.Equal("Plant Protection", response.DepartmentName);
        Assert.Equal(1, response.PendingInDistrict);
        Assert.Equal(1, response.ReviewedToday);
        Assert.Equal(2, response.ReviewedTotal);
        Assert.Equal(1, response.ApprovedTotal);
        Assert.Equal(1, response.RejectedTotal);
    }
}
