using System.Text.Json;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Advisories;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// Covers three additions to the advisory review flow that didn't exist before: an optional
/// review note that reaches the farmer as a notification, the previous-issues-on-this-crop
/// list, and the AI agent trace — all three gated to an Officer/Admin caller, never a Farmer's
/// own view of their own advisory.
/// </summary>
public class AdvisoriesControllerReviewContextTests
{
    private const int FarmerProfileId = 1;
    private const int FarmerUserId = 10;
    private const int OfficerUserId = 20;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (AgriLinkDbContext Db, AIAdvisory Advisory) SeedDraftAdvisoryWithTrace()
    {
        var db = CreateDb();

        db.Users.Add(new ApplicationUser { Id = FarmerUserId, UserName = "farmer@test.com", Email = "farmer@test.com", FullName = "Test Farmer" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = FarmerProfileId, UserId = FarmerUserId, NIC = "1", District = "Kandy" });

        var crop = new Crop
        {
            CropId = 1,
            CropType = "Tomato",
            Variety = "Roma",
            Field = new Field
            {
                FieldId = 1,
                Name = "Field 1",
                Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Kandy", FarmerProfileId = FarmerProfileId },
            },
        };
        db.Crops.Add(crop);

        // An earlier, already-resolved issue on the same crop — this is what PreviousIssues
        // on the new advisory should surface.
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 1,
            CropId = 1,
            FarmerProfileId = FarmerProfileId,
            Title = "Earlier wilting",
            Description = "Wilted last month.",
            Severity = IssueSeverity.Low,
            Status = IssueStatus.Resolved,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
        });

        var issue = new CropIssue
        {
            IssueId = 2,
            CropId = 1,
            FarmerProfileId = FarmerProfileId,
            Title = "Yellowing leaves",
            Description = "Leaves turning yellow.",
            Severity = IssueSeverity.Medium,
            Status = IssueStatus.AwaitingReview,
            Crop = crop,
        };

        var workflow = new AgentWorkflow
        {
            WorkflowId = 1,
            Objective = "Analyze crop issue: Yellowing leaves",
            Status = WorkflowStatus.Completed,
            StartedAt = DateTime.UtcNow.AddMinutes(-2),
            CompletedAt = DateTime.UtcNow.AddMinutes(-1),
            Executions =
            {
                new AgentExecution
                {
                    ExecutionId = 1,
                    AgentName = "PlannerAgent",
                    Status = ExecutionStatus.Completed,
                    InputData = JsonSerializer.Serialize(new { IssueTitle = "Yellowing leaves" }),
                    OutputData = JsonSerializer.Serialize(new { UseCropAgent = true, UseWeatherAgent = false }),
                    StartedAt = DateTime.UtcNow.AddMinutes(-2),
                    CompletedAt = DateTime.UtcNow.AddMinutes(-2),
                },
                new AgentExecution
                {
                    ExecutionId = 2,
                    AgentName = "ValidationAgent",
                    Status = ExecutionStatus.Completed,
                    InputData = JsonSerializer.Serialize(new { HasCropFindings = true }),
                    OutputData = JsonSerializer.Serialize(new { RiskLevel = "Medium" }),
                    StartedAt = DateTime.UtcNow.AddMinutes(-1),
                    CompletedAt = DateTime.UtcNow,
                },
            },
        };

        var advisory = new AIAdvisory
        {
            AdvisoryId = 1,
            IssueId = 2,
            Issue = issue,
            Status = AdvisoryStatus.Draft,
            RiskLevel = RiskLevel.Medium,
            Recommendation = "Apply nitrogen-rich fertiliser.",
            ConfidenceScore = 0.7f,
            Workflows = { workflow },
        };
        db.AIAdvisories.Add(advisory);
        db.SaveChanges();
        return (db, advisory);
    }

    private static AdvisoriesController CreateController(
        AgriLinkDbContext db, int actingUserId, string role, Mock<INotificationService>? notifications = null) => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db),
        (notifications ?? new Mock<INotificationService>()).Object)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
        },
    };

    [Fact]
    public async Task GetById_Officer_IncludesPreviousIssuesAndAgentTrace()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        var controller = CreateController(db, OfficerUserId, "Officer");

        var result = await controller.GetById(advisory.AdvisoryId);

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);

        Assert.NotNull(response.PreviousIssues);
        var previous = Assert.Single(response.PreviousIssues!);
        Assert.Equal("Earlier wilting", previous.Title);
        Assert.Equal(nameof(IssueStatus.Resolved), previous.Status);

        Assert.NotNull(response.AgentTrace);
        var trace = response.AgentTrace!;
        Assert.Equal(2, trace.Steps.Count);
        Assert.Equal("PlannerAgent", trace.Steps[0].AgentName);
        Assert.Equal("ValidationAgent", trace.Steps[1].AgentName);
        Assert.NotNull(trace.Steps[0].Output);
    }

    [Fact]
    public async Task GetById_Farmer_NeverGetsPreviousIssuesOrAgentTrace()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        // Approve it first — a Draft advisory 404s for the farmer regardless of this.
        advisory.Status = AdvisoryStatus.Approved;
        await db.SaveChangesAsync();

        var controller = CreateController(db, FarmerUserId, "Farmer");

        var result = await controller.GetById(advisory.AdvisoryId);

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Null(response.PreviousIssues);
        Assert.Null(response.AgentTrace);
    }

    [Fact]
    public async Task Approve_WithNote_StoresNoteAndReturnsItInResponse()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        var controller = CreateController(db, OfficerUserId, "Officer");

        var result = await controller.Approve(advisory.AdvisoryId, new ReviewAdvisoryRequest { Note = "  Looks like nitrogen deficiency, confirmed on inspection.  " });

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Looks like nitrogen deficiency, confirmed on inspection.", response.ReviewNote);

        var stored = await db.AIAdvisories.FindAsync(advisory.AdvisoryId);
        Assert.Equal("Looks like nitrogen deficiency, confirmed on inspection.", stored!.ReviewNote);
    }

    [Fact]
    public async Task Approve_NoBody_LeavesNoteNull()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        var controller = CreateController(db, OfficerUserId, "Officer");

        var result = await controller.Approve(advisory.AdvisoryId);

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Null(response.ReviewNote);
    }

    [Fact]
    public async Task Approve_NotifiesTheReportingFarmerWithTheNote()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        var notifications = new Mock<INotificationService>();
        var controller = CreateController(db, OfficerUserId, "Officer", notifications);

        await controller.Approve(advisory.AdvisoryId, new ReviewAdvisoryRequest { Note = "All good." });

        notifications.Verify(
            n => n.NotifyAsync(
                FarmerUserId,
                It.Is<string>(title => title.Contains("approved")),
                It.Is<string>(message => message.Contains("All good."))),
            Times.Once);
    }

    [Fact]
    public async Task Reject_NotifiesTheReportingFarmer()
    {
        var (db, advisory) = SeedDraftAdvisoryWithTrace();
        var notifications = new Mock<INotificationService>();
        var controller = CreateController(db, OfficerUserId, "Officer", notifications);

        await controller.Reject(advisory.AdvisoryId);

        notifications.Verify(
            n => n.NotifyAsync(FarmerUserId, It.Is<string>(title => title.Contains("rejected")), It.IsAny<string>()),
            Times.Once);
    }
}
