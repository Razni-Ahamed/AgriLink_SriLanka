using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Images;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Controllers;

public class IssuesControllerSearchSortTests
{
    private const int OfficerUserId = 50;

    private static AgriLinkDbContext Seed()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        db.OfficerProfiles.Add(new OfficerProfile { UserId = OfficerUserId, District = "Kandy", Department = new Department { Name = "Extension" } });

        var start = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);
        (int Id, string Title, string CropType, IssueSeverity Severity, IssueStatus Status, string Farmer)[] issues =
        {
            (1, "Yellow leaves", "Tomato", IssueSeverity.Low, IssueStatus.AwaitingReview, "Kamal Perera"),
            (2, "Brown spots", "Paddy", IssueSeverity.High, IssueStatus.AwaitingReview, "Nimal Silva"),
            (3, "Wilting plants", "Tomato", IssueSeverity.Medium, IssueStatus.Resolved, "Sunil Fernando"),
            (4, "Blast on paddy", "Paddy", IssueSeverity.High, IssueStatus.Rejected, "Kamal Perera"),
        };
        foreach (var issue in issues)
        {
            var userId = 100 + issue.Id;
            db.Users.Add(new ApplicationUser { Id = userId, UserName = $"f{issue.Id}", Email = $"f{issue.Id}@test.lk", FullName = issue.Farmer });
            db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = userId, UserId = userId, NIC = issue.Id.ToString(), District = "Kandy" });
            db.CropIssues.Add(new CropIssue
            {
                IssueId = issue.Id,
                FarmerProfileId = userId,
                Crop = new Crop
                {
                    CropType = issue.CropType,
                    Variety = "Local",
                    Field = new Field { Name = "F", Farm = new Farm { Name = "Farm", District = "Kandy", FarmerProfileId = userId } },
                },
                Title = issue.Title,
                Description = "Reported from the field.",
                Severity = issue.Severity,
                Status = issue.Status,
                CreatedAt = start.AddDays(issue.Id),
                Advisories =
                {
                    new AIAdvisory
                    {
                        Status = issue.Status == IssueStatus.AwaitingReview ? AdvisoryStatus.Draft : AdvisoryStatus.Approved,
                    },
                },
            });
        }

        db.SaveChanges();
        return db;
    }

    private static IssuesController CreateController(AgriLinkDbContext db, int userId, string role) =>
        new(db, new CurrentUserService(db), Mock.Of<IAgentOrchestrator>(), Mock.Of<IIssuePhotoProcessor>(),
            Mock.Of<IImageStorageService>(), NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
            },
        };

    private static List<int> Ids(ActionResult<PagedResponse<CropIssueResponse>> result) =>
        Assert.IsType<PagedResponse<CropIssueResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value)
            .Items.Select(i => i.IssueId).ToList();

    [Fact]
    public async Task GetAll_NewestFirst_ByDefault()
    {
        using var db = Seed();

        Assert.Equal(new[] { 4, 3, 2, 1 }, Ids(await CreateController(db, 1, "Admin").GetAll()));
    }

    [Theory]
    [InlineData("oldest", new[] { 1, 2, 3, 4 })]
    [InlineData("OLDEST", new[] { 1, 2, 3, 4 })]
    [InlineData("severity", new[] { 2, 4, 3, 1 })] // High (oldest first), then Medium, then Low
    public async Task GetAll_SortsAsAsked(string sort, int[] expected)
    {
        using var db = Seed();

        Assert.Equal(expected, Ids(await CreateController(db, 1, "Admin").GetAll(sort: sort)));
    }

    [Theory]
    [InlineData("paddy", new[] { 4, 2 })] // crop type
    [InlineData("  WILTING ", new[] { 3 })] // title, trimmed and case-insensitive
    [InlineData("kamal", new[] { 4, 1 })] // reporter
    [InlineData("kandy", new[] { 4, 3, 2, 1 })] // district
    [InlineData("no such thing", new int[0])]
    public async Task GetAll_SearchMatchesTitleCropReporterOrDistrict(string search, int[] expected)
    {
        using var db = Seed();

        Assert.Equal(expected, Ids(await CreateController(db, 1, "Admin").GetAll(search: search)));
    }

    [Fact]
    public async Task GetAll_FiltersByStatus_AndCombinesWithSearch()
    {
        using var db = Seed();
        var controller = CreateController(db, 1, "Admin");

        Assert.Equal(new[] { 2, 1 }, Ids(await controller.GetAll(status: IssueStatus.AwaitingReview)));
        Assert.Equal(new[] { 1 }, Ids(await controller.GetAll(status: IssueStatus.AwaitingReview, search: "kamal")));
    }

    [Fact]
    public async Task GetAll_UnknownSort_IsABadRequest()
    {
        using var db = Seed();

        Assert.IsType<BadRequestObjectResult>((await CreateController(db, 1, "Admin").GetAll(sort: "random")).Result);
    }

    [Fact]
    public async Task Pending_KeepsTheQueueOrderByDefault_AndSortsBySeverityOnRequest()
    {
        using var db = Seed();
        var controller = CreateController(db, OfficerUserId, "Officer");

        Assert.Equal(new[] { 1, 2 }, Ids(await controller.Pending()));
        Assert.Equal(new[] { 2, 1 }, Ids(await controller.Pending(sort: "severity")));
        Assert.Equal(new[] { 2, 1 }, Ids(await controller.Pending(sort: "newest")));
        Assert.Equal(new[] { 2 }, Ids(await controller.Pending(search: "nimal")));
        Assert.IsType<BadRequestObjectResult>((await controller.Pending(sort: "random")).Result);
    }
}
