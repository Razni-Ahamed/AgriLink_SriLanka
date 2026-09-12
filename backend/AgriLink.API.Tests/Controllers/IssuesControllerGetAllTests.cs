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
/// Admin's full oversight view — every issue ever reported, any status — distinct from
/// Officer's Pending() queue, which only shows issues still awaiting a decision.
/// </summary>
public class IssuesControllerGetAllTests
{
    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IssuesController CreateController(AgriLinkDbContext db, int actingUserId, string role) =>
        new(db, new CurrentUserService(db), Mock.Of<IAgentOrchestrator>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
            },
        };

    private static void SeedIssue(AgriLinkDbContext db, int issueId, IssueStatus status, AdvisoryStatus advisoryStatus, string farmerName)
    {
        var userId = 100 + issueId;
        var farmerProfileId = 100 + issueId;

        db.Users.Add(new ApplicationUser { Id = userId, UserName = $"farmer{issueId}@test.com", Email = $"farmer{issueId}@test.com", FullName = farmerName });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = farmerProfileId, UserId = userId, NIC = issueId.ToString(), District = "Kandy" });

        db.CropIssues.Add(new CropIssue
        {
            IssueId = issueId,
            CropId = issueId,
            FarmerProfileId = farmerProfileId,
            Crop = new Crop
            {
                CropId = issueId,
                CropType = "Tomato",
                Variety = "Roma",
                Field = new Field
                {
                    FieldId = issueId,
                    Name = $"Field {issueId}",
                    Farm = new Farm { FarmId = issueId, Name = $"Farm {issueId}", District = "Kandy", FarmerProfileId = farmerProfileId },
                },
            },
            Title = $"Issue {issueId}",
            Description = "Some description.",
            Status = status,
            Advisories = { new AIAdvisory { AdvisoryId = issueId, IssueId = issueId, Status = advisoryStatus } },
        });
    }

    [Fact]
    public async Task GetAll_ReturnsEveryIssueRegardlessOfStatus_WithReporterName()
    {
        using var db = CreateDb();
        SeedIssue(db, issueId: 1, IssueStatus.AwaitingReview, AdvisoryStatus.Draft, "Farmer One");
        SeedIssue(db, issueId: 2, IssueStatus.Resolved, AdvisoryStatus.Approved, "Farmer Two");
        SeedIssue(db, issueId: 3, IssueStatus.Rejected, AdvisoryStatus.Rejected, "Farmer Three");
        db.SaveChanges();

        var controller = CreateController(db, actingUserId: 999, role: "Admin");

        var result = await controller.GetAll();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value).ToList();

        Assert.Equal(3, issues.Count);
        Assert.Contains(issues, i => i.ReporterName == "Farmer One" && i.Status == nameof(IssueStatus.AwaitingReview));
        Assert.Contains(issues, i => i.ReporterName == "Farmer Two" && i.Status == nameof(IssueStatus.Resolved));
        Assert.Contains(issues, i => i.ReporterName == "Farmer Three" && i.Status == nameof(IssueStatus.Rejected));
    }
}
