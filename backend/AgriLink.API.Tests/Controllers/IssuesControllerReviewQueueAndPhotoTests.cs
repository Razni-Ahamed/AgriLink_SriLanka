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

public class IssuesControllerReviewQueueAndPhotoTests
{
    private const int FarmerUserId = 10;
    private const int OtherFarmerUserId = 11;
    private const int OfficerUserId = 20;
    private const string StorageKey = "issues/0123456789abcdef0123456789abcdef.jpg";

    private readonly Mock<IImageStorageService> _storage = new();

    private static AgriLinkDbContext Seed()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        db.Users.AddRange(
            new ApplicationUser { Id = FarmerUserId, UserName = "f@test.com", Email = "f@test.com", FullName = "Test Farmer" },
            new ApplicationUser { Id = OtherFarmerUserId, UserName = "o@test.com", Email = "o@test.com", FullName = "Other Farmer" });
        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = 2, UserId = OtherFarmerUserId, NIC = "2", District = "Kandy" });
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Kandy" });
        db.Crops.Add(new Crop
        {
            CropId = 1,
            CropType = "Cassava",
            Variety = "MU 51",
            Field = new Field { FieldId = 1, Name = "North", Farm = new Farm { FarmId = 1, Name = "Farm", District = "Kandy", FarmerProfileId = 1 } },
        });

        // Reported first, but its advice has already reached the farmer.
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 1, CropId = 1, FarmerProfileId = 1, Title = "Preliminary", Description = "d",
            Status = IssueStatus.AwaitingReview, CreatedAt = DateTime.UtcNow.AddHours(-3),
            Advisories = { new AIAdvisory { AdvisoryId = 1, Status = AdvisoryStatus.Preliminary } },
            Images = { new IssueImage { ImageId = 5, StorageKey = StorageKey, ContentType = "image/jpeg" } },
        });
        // Reported later, and the farmer has had no advice yet.
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 2, CropId = 1, FarmerProfileId = 1, Title = "Needs inspection", Description = "d",
            Status = IssueStatus.AwaitingReview, CreatedAt = DateTime.UtcNow.AddHours(-1),
            Advisories = { new AIAdvisory { AdvisoryId = 2, Status = AdvisoryStatus.Draft } },
        });
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 3, CropId = 1, FarmerProfileId = 1, Title = "Done", Description = "d",
            Status = IssueStatus.Resolved, CreatedAt = DateTime.UtcNow.AddHours(-5),
            Advisories = { new AIAdvisory { AdvisoryId = 3, Status = AdvisoryStatus.Approved } },
        });

        db.SaveChanges();
        return db;
    }

    private IssuesController CreateController(AgriLinkDbContext db, int userId, string role) =>
        new(
            db,
            new CurrentUserService(db),
            Mock.Of<IAgentOrchestrator>(),
            Mock.Of<IIssuePhotoProcessor>(),
            _storage.Object,
            NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
            },
        };

    [Fact]
    public async Task Pending_IncludesPreliminaryAdvice_AfterCasesThatNeedInspection()
    {
        using var db = Seed();

        var result = await CreateController(db, OfficerUserId, "Officer").Pending();

        var issues = Assert.IsAssignableFrom<IEnumerable<CropIssueResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value).ToList();
        Assert.Equal(new[] { "Needs inspection", "Preliminary" }, issues.Select(i => i.Title));
        Assert.Equal(new[] { nameof(AdvisoryStatus.Draft), nameof(AdvisoryStatus.Preliminary) }, issues.Select(i => i.AdvisoryStatus));
        Assert.Equal(new[] { false, true }, issues.Select(i => i.HasPhoto));
    }

    [Theory]
    [InlineData(FarmerUserId, "Farmer")]
    [InlineData(OfficerUserId, "Officer")]
    public async Task GetImage_ReportingFarmerAndOfficers_GetTheStoredPhoto(int userId, string role)
    {
        using var db = Seed();
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
        _storage.Setup(s => s.OpenReadAsync(StorageKey, It.IsAny<CancellationToken>())).ReturnsAsync(new MemoryStream(bytes));
        var controller = CreateController(db, userId, role);

        var result = await controller.GetImage(issueId: 1, imageId: 5);

        var file = Assert.IsType<FileStreamResult>(result);
        Assert.Equal("image/jpeg", file.ContentType);
        using var copy = new MemoryStream();
        await file.FileStream.CopyToAsync(copy);
        Assert.Equal(bytes, copy.ToArray());
        Assert.StartsWith("private", controller.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task GetImage_AnotherFarmer_IsForbidden_AndStorageIsNeverRead()
    {
        using var db = Seed();

        var result = await CreateController(db, OtherFarmerUserId, "Farmer").GetImage(issueId: 1, imageId: 5);

        Assert.IsType<ForbidResult>(result);
        _storage.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(1, 999)] // no such photo
    [InlineData(2, 5)] // photo exists, but on a different issue
    public async Task GetImage_PhotoNotOnThatIssue_IsNotFound(int issueId, int imageId)
    {
        using var db = Seed();

        var result = await CreateController(db, OfficerUserId, "Officer").GetImage(issueId, imageId);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetImage_PhotoMissingFromStorage_IsNotFound()
    {
        using var db = Seed();
        _storage.Setup(s => s.OpenReadAsync(StorageKey, It.IsAny<CancellationToken>())).ThrowsAsync(new FileNotFoundException());

        var result = await CreateController(db, OfficerUserId, "Officer").GetImage(issueId: 1, imageId: 5);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetImage_StorageUnavailable_Returns503()
    {
        using var db = Seed();
        _storage.Setup(s => s.OpenReadAsync(StorageKey, It.IsAny<CancellationToken>())).ThrowsAsync(new ImageStorageException("down"));

        var result = await CreateController(db, OfficerUserId, "Officer").GetImage(issueId: 1, imageId: 5);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result).StatusCode);
    }
}
