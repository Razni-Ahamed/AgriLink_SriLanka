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
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Integration;

/// <summary>
/// The issue lists load their advice and photos as split, untracked queries, and the session
/// check's cache is evicted at transaction commit. Both only mean anything against PostgreSQL.
/// </summary>
public class PostgresListQueryTests : IClassFixture<PostgresDatabase>
{
    private readonly PostgresDatabase _database;

    public PostgresListQueryTests(PostgresDatabase database)
    {
        _database = database;
    }

    private void SkipWithoutPostgres() =>
        Skip.IfNot(_database.Available, $"Set {PostgresDatabase.Variable} to run the PostgreSQL integration tests.");

    private static ApplicationUser NewUser(string email) => new()
    {
        UserName = email,
        NormalizedUserName = email.ToUpperInvariant(),
        Email = email,
        NormalizedEmail = email.ToUpperInvariant(),
        FullName = "Integration Test",
        SecurityStamp = Guid.NewGuid().ToString(),
        IsActive = true,
        RegistrationStatus = RegistrationStatus.Approved,
    };

    private static IssuesController Controller(AgriLinkDbContext db, int userId, string role) =>
        new(db, new CurrentUserService(db), Mock.Of<IAgentOrchestrator>(), Mock.Of<IIssuePhotoProcessor>(),
            Mock.Of<IImageStorageService>(), NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
            },
        };

    private static PagedResponse<CropIssueResponse> Page(ActionResult<PagedResponse<CropIssueResponse>> result) =>
        Assert.IsType<PagedResponse<CropIssueResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);

    [SkippableFact]
    public async Task IssueLists_PageAndCarryTheirAdviceAndPhotos()
    {
        SkipWithoutPostgres();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var sameTime = new DateTime(2026, 11, 1, 8, 0, 0, DateTimeKind.Utc);
        int farmerUserId;
        await using (var db = _database.CreateContext())
        {
            var farmerUser = NewUser($"farmer-{tag}@agrilink.test");
            var farmer = new FarmerProfile { User = farmerUser, NIC = "199012345678", District = "Kandy" };
            var crop = new Crop
            {
                CropType = "Tomato",
                Field = new Field { Name = "North", Area = 1, Farm = new Farm { Name = "Hill", District = "Kandy", Area = 2, FarmerProfile = farmer } },
            };

            // Five issues reported in the same instant, so paging relies on the id tiebreaker.
            for (var i = 0; i < 5; i++)
            {
                var issue = new CropIssue
                {
                    Crop = crop, FarmerProfile = farmer, Title = $"Leaf spots {tag} {i}", Description = "d",
                    Status = IssueStatus.AwaitingReview, CreatedAt = sameTime,
                };
                issue.Advisories.Add(new AIAdvisory { Status = AdvisoryStatus.Rejected, Recommendation = "old" });
                issue.Advisories.Add(new AIAdvisory { Status = AdvisoryStatus.Draft, Recommendation = "new" });
                issue.Images.Add(new IssueImage { StorageKey = $"a-{tag}-{i}", ContentType = "image/jpeg" });
                issue.Images.Add(new IssueImage { StorageKey = $"b-{tag}-{i}", ContentType = "image/jpeg" });
                db.CropIssues.Add(issue);
            }

            await db.SaveChangesAsync();
            farmerUserId = farmerUser.Id;
        }

        await using var read = _database.CreateContext();
        var admin = Controller(read, userId: 1, "Admin");

        var all = new List<CropIssueResponse>();
        for (var page = 1; page <= 3; page++)
        {
            var result = Page(await admin.GetAll(page, pageSize: 2, search: tag));
            Assert.Equal(5, result.TotalCount);
            all.AddRange(result.Items);
        }

        Assert.Equal(5, all.Select(i => i.IssueId).Distinct().Count());
        Assert.All(all, i =>
        {
            Assert.Equal(nameof(AdvisoryStatus.Draft), i.AdvisoryStatus);
            Assert.True(i.HasPhoto);
            Assert.Equal("Kandy", i.District);
        });

        var queue = Page(await admin.Pending(1, 10, search: tag));
        Assert.Equal(5, queue.Items.Count);

        var mine = Page(await Controller(read, farmerUserId, "Farmer").Mine(1, 10));
        Assert.Equal(5, mine.Items.Count);
        Assert.Empty(read.ChangeTracker.Entries());
    }

    [SkippableFact]
    public async Task StampChangedInsideATransaction_IsSeenOnceItCommits()
    {
        SkipWithoutPostgres();
        var cache = new AccountStateCache(new MemoryCache(new MemoryCacheOptions()), TimeSpan.FromMinutes(5));
        var interceptor = new AccountStateInvalidationInterceptor(cache);
        AgriLinkDbContext Context() => new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseNpgsql(_database.ConnectionString!)
            .AddInterceptors(interceptor)
            .Options);
        async Task<bool> Valid(int id, string stamp)
        {
            await using var db = Context();
            return await new AccountSessionValidator(db, cache).IsValidAsync(id, stamp, CancellationToken.None);
        }

        var user = NewUser($"stamp-{Guid.NewGuid():N}@agrilink.test");
        user.SecurityStamp = "old-stamp";
        await using (var db = Context())
        {
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        await using (var db = Context())
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            (await db.Users.SingleAsync(u => u.Id == user.Id)).SecurityStamp = "new-stamp";
            await db.SaveChangesAsync();

            // Another request between the save and the commit still reads the old row, and caches it.
            Assert.True(await Valid(user.Id, "old-stamp"));
            await transaction.CommitAsync();
        }

        Assert.False(await Valid(user.Id, "old-stamp"));
        Assert.True(await Valid(user.Id, "new-stamp"));
    }
}
