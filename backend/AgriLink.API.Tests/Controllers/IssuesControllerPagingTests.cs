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

public class IssuesControllerPagingTests
{
    private const int FarmerUserId = 10;
    private const int OfficerUserId = 20;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IssuesController CreateController(AgriLinkDbContext db, int actingUserId, string role) =>
        new(
            db,
            new CurrentUserService(db),
            Mock.Of<IAgentOrchestrator>(),
            Mock.Of<IIssuePhotoProcessor>(),
            Mock.Of<IImageStorageService>(),
            NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    private static (AgriLinkDbContext Db, int FarmerProfileId) SeedFarmerWithCrop(string district = "Kandy")
    {
        var db = CreateDb();
        db.Users.Add(new ApplicationUser { Id = FarmerUserId, UserName = "farmer@test.com", Email = "farmer@test.com", FullName = "Test Farmer" });
        var farmerProfile = new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = district };
        db.FarmerProfiles.Add(farmerProfile);
        db.Crops.Add(new Crop
        {
            CropId = 1,
            CropType = "Tea",
            Field = new Field { FieldId = 1, Name = "Field 1", Farm = new Farm { FarmId = 1, Name = "Farm 1", District = district, FarmerProfileId = 1 } },
        });
        db.SaveChanges();
        return (db, farmerProfile.FarmerProfileId);
    }

    [Fact]
    public async Task Mine_PagesCorrectly_WithAccurateTotalCountAndTotalPages()
    {
        var (db, farmerProfileId) = SeedFarmerWithCrop();
        var baseTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 25; i++)
        {
            db.CropIssues.Add(new CropIssue
            {
                IssueId = i + 1,
                CropId = 1,
                FarmerProfileId = farmerProfileId,
                Title = $"Issue {i}",
                Description = "d",
                Status = IssueStatus.AwaitingReview,
                CreatedAt = baseTime.AddMinutes(i),
            });
        }
        await db.SaveChangesAsync();

        var controller = CreateController(db, FarmerUserId, "Farmer");

        var firstPage = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: 1, pageSize: 10)).Result).Value);

        Assert.Equal(25, firstPage.TotalCount);
        Assert.Equal(3, firstPage.TotalPages);
        Assert.Equal(1, firstPage.Page);
        Assert.Equal(10, firstPage.PageSize);
        Assert.Equal(10, firstPage.Items.Count);
        // Newest first (OrderByDescending CreatedAt) — "Issue 24" was created last.
        Assert.Equal("Issue 24", firstPage.Items[0].Title);

        var lastPage = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: 3, pageSize: 10)).Result).Value);

        Assert.Equal(5, lastPage.Items.Count);
        Assert.Equal("Issue 0", lastPage.Items[^1].Title);
    }

    [Theory]
    [InlineData(1000, 100)]
    [InlineData(1, 1)]
    [InlineData(0, 1)]
    [InlineData(-5, 1)]
    public async Task Mine_PageSizeIsClampedRatherThanRejected(int requestedPageSize, int expectedPageSize)
    {
        var (db, farmerProfileId) = SeedFarmerWithCrop();
        db.CropIssues.Add(new CropIssue { IssueId = 1, CropId = 1, FarmerProfileId = farmerProfileId, Title = "Only issue", Description = "d", Status = IssueStatus.AwaitingReview });
        await db.SaveChangesAsync();
        var controller = CreateController(db, FarmerUserId, "Farmer");

        var result = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: 1, pageSize: requestedPageSize)).Result).Value);

        Assert.Equal(expectedPageSize, result.PageSize);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task Mine_InvalidPageNumberIsClampedToOne(int requestedPage)
    {
        var (db, farmerProfileId) = SeedFarmerWithCrop();
        db.CropIssues.Add(new CropIssue { IssueId = 1, CropId = 1, FarmerProfileId = farmerProfileId, Title = "Only issue", Description = "d", Status = IssueStatus.AwaitingReview });
        await db.SaveChangesAsync();
        var controller = CreateController(db, FarmerUserId, "Farmer");

        var result = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Mine(page: requestedPage, pageSize: 10)).Result).Value);

        Assert.Equal(1, result.Page);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task Pending_DraftBeforePreliminary_ThenOldestFirst_HoldsAcrossPages()
    {
        var (db, farmerProfileId) = SeedFarmerWithCrop();
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Kandy" });

        var baseTime = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        void AddIssue(int id, string title, AdvisoryStatus status, int minutesOffset)
        {
            db.CropIssues.Add(new CropIssue
            {
                IssueId = id,
                CropId = 1,
                FarmerProfileId = farmerProfileId,
                Title = title,
                Description = "d",
                Status = IssueStatus.AwaitingReview,
                CreatedAt = baseTime.AddMinutes(minutesOffset),
                Advisories = { new AIAdvisory { AdvisoryId = id, IssueId = id, Status = status } },
            });
        }

        // Preliminary, oldest overall.
        AddIssue(1, "A-Preliminary-oldest", AdvisoryStatus.Preliminary, 0);
        // Draft, older of the two Drafts.
        AddIssue(2, "B-Draft-older", AdvisoryStatus.Draft, 1);
        // Draft, newer of the two Drafts.
        AddIssue(3, "C-Draft-newer", AdvisoryStatus.Draft, 2);
        // Preliminary, newest overall.
        AddIssue(4, "D-Preliminary-newest", AdvisoryStatus.Preliminary, 3);
        await db.SaveChangesAsync();

        var controller = CreateController(db, OfficerUserId, "Officer");

        var firstPage = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Pending(page: 1, pageSize: 2)).Result).Value);
        Assert.Equal(new[] { "B-Draft-older", "C-Draft-newer" }, firstPage.Items.Select(i => i.Title));

        var secondPage = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Pending(page: 2, pageSize: 2)).Result).Value);
        Assert.Equal(new[] { "A-Preliminary-oldest", "D-Preliminary-newest" }, secondPage.Items.Select(i => i.Title));
    }

    [Fact]
    public async Task Pending_DistrictScopingStillAppliesWithPaging()
    {
        var (db, kandyFarmerProfileId) = SeedFarmerWithCrop("Kandy");
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Kandy" });

        // A second district's issues must not count toward this officer's page/total.
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 2, UserId = 11, NIC = "2", District = "Galle" });
        db.Crops.Add(new Crop
        {
            CropId = 2,
            CropType = "Cinnamon",
            Field = new Field { FieldId = 2, Name = "Field G", Farm = new Farm { FarmId = 2, Name = "Galle Farm", District = "Galle", FarmerProfileId = 2 } },
        });

        for (var i = 0; i < 3; i++)
        {
            db.CropIssues.Add(new CropIssue
            {
                IssueId = i + 1,
                CropId = 1,
                FarmerProfileId = kandyFarmerProfileId,
                Title = $"Kandy {i}",
                Description = "d",
                Status = IssueStatus.AwaitingReview,
                Advisories = { new AIAdvisory { AdvisoryId = i + 1, Status = AdvisoryStatus.Draft } },
            });
        }
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 100,
            CropId = 2,
            FarmerProfileId = 2,
            Title = "Galle issue",
            Description = "d",
            Status = IssueStatus.AwaitingReview,
            Advisories = { new AIAdvisory { AdvisoryId = 100, Status = AdvisoryStatus.Draft } },
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db, OfficerUserId, "Officer");

        var result = Assert.IsType<PagedResponse<CropIssueResponse>>(
            Assert.IsType<OkObjectResult>((await controller.Pending(page: 1, pageSize: 2)).Result).Value);

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.All(result.Items, i => Assert.StartsWith("Kandy", i.Title));
    }
}
