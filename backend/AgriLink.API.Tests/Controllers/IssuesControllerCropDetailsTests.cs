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
/// Issue responses carry the crop's type and variety, not just its id. The farmer's "My Issues"
/// list and the officer's "Pending Issues" queue both render that, and a bare CropId told
/// neither of them what the issue was actually about.
/// </summary>
public class IssuesControllerCropDetailsTests
{
    private const int FarmerProfileId = 1;
    private const int FarmerUserId = 10;
    private const int OfficerUserId = 20;

    private static AgriLinkDbContext SeedIssue()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        db.FarmerProfiles.Add(new FarmerProfile
        {
            FarmerProfileId = FarmerProfileId,
            UserId = FarmerUserId,
            NIC = "1",
            District = "Kandy",
        });

        db.Crops.Add(new Crop
        {
            CropId = 1,
            CropType = "Paddy",
            Variety = "Samba",
            Field = new Field
            {
                FieldId = 1,
                Name = "North Field",
                Farm = new Farm
                {
                    FarmId = 1,
                    Name = "Green Acres",
                    District = "Kandy",
                    FarmerProfileId = FarmerProfileId,
                },
            },
        });

        db.CropIssues.Add(new CropIssue
        {
            IssueId = 1,
            CropId = 1,
            FarmerProfileId = FarmerProfileId,
            Title = "Yellow leaves",
            Description = "Lower leaves turning yellow.",
            Severity = IssueSeverity.Medium,
            Status = IssueStatus.AwaitingReview,
            Advisories =
            {
                new AIAdvisory { AdvisoryId = 1, Status = AdvisoryStatus.Draft },
            },
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
    public async Task Mine_IncludesCropTypeAndVariety()
    {
        var db = SeedIssue();
        var controller = CreateController(db, FarmerUserId, "Farmer");

        var result = await controller.Mine();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        var issue = Assert.Single(issues);
        Assert.Equal("Paddy", issue.CropType);
        Assert.Equal("Samba", issue.Variety);
    }

    [Fact]
    public async Task Pending_IncludesCropTypeAndVariety()
    {
        var db = SeedIssue();
        var controller = CreateController(db, OfficerUserId, "Officer");

        var result = await controller.Pending();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>(result.Result).Value);
        var issue = Assert.Single(issues);
        Assert.Equal("Paddy", issue.CropType);
        Assert.Equal("Samba", issue.Variety);
    }
}
