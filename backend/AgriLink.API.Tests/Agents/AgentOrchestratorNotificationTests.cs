using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace AgriLink.API.Tests.Agents;

/// <summary>
/// The pipeline only queues its notifications; IssuesController saves them in the same
/// SaveChangesAsync as the issue. Before this, officers were notified (and the notification saved)
/// while the pipeline ran, so a failed issue save left them a notification about nothing.
/// </summary>
public class AgentOrchestratorNotificationTests
{
    private const int OfficerUserId = 100;

    /// <summary>Fails any save that would write a new crop issue, like a database error at that moment.</summary>
    private sealed class FailingIssueSaveInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<CropIssue>().Any(e => e.State == EntityState.Added))
            {
                throw new DbUpdateException("Simulated failure while saving the issue.");
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private static AgriLinkDbContext CreateDb(string name, params IInterceptor[] interceptors) =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(name)
            .AddInterceptors(interceptors)
            .Options);

    private static AgentOrchestrator CreateOrchestrator(AgriLinkDbContext db)
    {
        var planner = new Mock<IPlannerAgent>();
        planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false });
        var cropAgent = new Mock<ICropAnalysisAgent>();
        cropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CropFindings());
        var validationAgent = new Mock<IValidationAgent>();
        validationAgent.Setup(v => v.ValidateAsync(
                It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult { Recommendation = "Inspect the roots." });

        return new AgentOrchestrator(
            db,
            new NotificationService(db),
            planner.Object,
            cropAgent.Object,
            Mock.Of<IWeatherAgent>(),
            validationAgent.Object,
            Mock.Of<IImageClassifier>(),
            new DiseaseKnowledgeBase(),
            Options.Create(new ImageClassificationOptions()),
            Mock.Of<ILogger<AgentOrchestrator>>());
    }

    private static (CropIssue Issue, Crop Crop) NewIssue() =>
        (new CropIssue
        {
            CropId = 1,
            FarmerProfileId = 1,
            Title = "Leaves wilting",
            Description = "Leaves are wilting rapidly.",
            Severity = IssueSeverity.Medium,
            Status = IssueStatus.AwaitingReview,
        },
        new Crop
        {
            CropId = 1,
            CropType = "Rice",
            Field = new Field { FieldId = 1, Name = "Field 1", Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Colombo" } },
        });

    private static async Task SeedOfficerAsync(AgriLinkDbContext db)
    {
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = OfficerUserId, DepartmentId = 1, District = "Colombo" });
        await db.SaveChangesAsync();
    }

    // What IssuesController does after the pipeline returns.
    private static Task SaveIssueAsync(AgriLinkDbContext db, CropIssue issue, Crop crop, AIAdvisory advisory)
    {
        issue.Advisories.Add(advisory);
        issue.Crop = crop;
        db.CropIssues.Add(issue);
        return db.SaveChangesAsync();
    }

    [Fact]
    public async Task RunPipelineAsync_QueuesTheOfficerNotification_WithoutSavingIt()
    {
        using var db = CreateDb(Guid.NewGuid().ToString());
        await SeedOfficerAsync(db);
        var (issue, crop) = NewIssue();

        await CreateOrchestrator(db).RunPipelineAsync(issue, crop, Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

        Assert.Empty(await db.Notifications.ToListAsync());
        var queued = Assert.Single(db.ChangeTracker.Entries<Notification>());
        Assert.Equal(EntityState.Added, queued.State);
        Assert.Equal(OfficerUserId, queued.Entity.UserId);
    }

    [Fact]
    public async Task TheIssueSave_WritesTheIssueAndItsOfficerNotificationTogether()
    {
        using var db = CreateDb(Guid.NewGuid().ToString());
        await SeedOfficerAsync(db);
        var (issue, crop) = NewIssue();

        var advisory = await CreateOrchestrator(db).RunPipelineAsync(issue, crop, Array.Empty<CropActivity>(), photo: null, CancellationToken.None);
        await SaveIssueAsync(db, issue, crop, advisory);

        Assert.Single(await db.CropIssues.ToListAsync());
        var notification = Assert.Single(await db.Notifications.ToListAsync());
        Assert.Equal(OfficerUserId, notification.UserId);
    }

    [Fact]
    public async Task AFailedIssueSave_LeavesNoNotificationAboutAnIssueThatDoesNotExist()
    {
        var name = Guid.NewGuid().ToString();
        using var db = CreateDb(name, new FailingIssueSaveInterceptor());
        await SeedOfficerAsync(db);
        var (issue, crop) = NewIssue();

        var advisory = await CreateOrchestrator(db).RunPipelineAsync(issue, crop, Array.Empty<CropActivity>(), photo: null, CancellationToken.None);
        await Assert.ThrowsAsync<DbUpdateException>(() => SaveIssueAsync(db, issue, crop, advisory));

        using var check = CreateDb(name);
        Assert.Empty(await check.CropIssues.ToListAsync());
        Assert.Empty(await check.Notifications.ToListAsync());
    }
}
