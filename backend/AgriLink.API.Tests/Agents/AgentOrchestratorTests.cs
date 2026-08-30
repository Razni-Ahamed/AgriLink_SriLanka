using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace AgriLink.API.Tests.Agents;

public class AgentOrchestratorTests
{
    private static AgriLinkDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AgriLinkDbContext(options);
    }

    private static Crop CreateCrop(string district = "Colombo") => new()
    {
        CropId = 1,
        CropType = "Rice",
        Variety = "Test",
        PlantingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
        ExpectedHarvestDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60)),
        Field = new Field
        {
            FieldId = 1,
            Name = "Field 1",
            Farm = new Farm { FarmId = 1, Name = "Farm 1", District = district },
        },
    };

    private static CropIssue CreateIssue(IssueSeverity severity = IssueSeverity.Medium) => new()
    {
        IssueId = 1,
        CropId = 1,
        FarmerProfileId = 1,
        Title = "Leaves wilting",
        Description = "Leaves are wilting rapidly.",
        Severity = severity,
    };

    private static AgentOrchestrator CreateOrchestrator(
        AgriLinkDbContext db,
        Mock<INotificationService> notifications,
        Mock<IPlannerAgent> planner,
        Mock<ICropAnalysisAgent> cropAgent,
        Mock<IWeatherAgent> weatherAgent,
        Mock<IValidationAgent> validationAgent) => new(
            db,
            notifications.Object,
            planner.Object,
            cropAgent.Object,
            weatherAgent.Object,
            validationAgent.Object,
            Mock.Of<ILogger<AgentOrchestrator>>());

    [Fact]
    public async Task RunPipelineAsync_HappyPath_ProducesDraftAdvisoryWithExecutionPerAgent()
    {
        using var db = CreateDb();
        var notifications = new Mock<INotificationService>();
        var planner = new Mock<IPlannerAgent>();
        var cropAgent = new Mock<ICropAnalysisAgent>();
        var weatherAgent = new Mock<IWeatherAgent>();
        var validationAgent = new Mock<IValidationAgent>();

        planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = true });
        cropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CropFindings { Confidence = 0.8f });
        weatherAgent.Setup(w => w.GetWeatherFindingsAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherFindings { Summary = "Clear skies" });
        validationAgent.Setup(v => v.ValidateAsync(
                It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult
            {
                RiskLevel = RiskLevel.High,
                Recommendation = "See an officer.",
                ConfidenceScore = 0.9f,
                RequiresApproval = false,
            });

        var orchestrator = CreateOrchestrator(db, notifications, planner, cropAgent, weatherAgent, validationAgent);

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        Assert.True(advisory.RequiresApproval);
        Assert.Equal(RiskLevel.High, advisory.RiskLevel);

        var workflow = Assert.Single(advisory.Workflows);
        Assert.Equal(WorkflowStatus.Completed, workflow.Status);

        var agentNames = workflow.Executions.Select(e => e.AgentName).ToList();
        Assert.Equal(new[] { "PlannerAgent", "CropAnalysisAgent", "WeatherAgent", "ValidationAgent" }, agentNames);
        Assert.All(workflow.Executions, e => Assert.Equal(ExecutionStatus.Completed, e.Status));
    }

    [Fact]
    public async Task RunPipelineAsync_ValidationAgentThrows_ReturnsSafeFallbackAdvisory()
    {
        using var db = CreateDb();
        var notifications = new Mock<INotificationService>();
        var planner = new Mock<IPlannerAgent>();
        var cropAgent = new Mock<ICropAnalysisAgent>();
        var weatherAgent = new Mock<IWeatherAgent>();
        var validationAgent = new Mock<IValidationAgent>();

        planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false });
        cropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CropFindings());
        validationAgent.Setup(v => v.ValidateAsync(
                It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var orchestrator = CreateOrchestrator(db, notifications, planner, cropAgent, weatherAgent, validationAgent);

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        Assert.True(advisory.RequiresApproval);
        Assert.False(string.IsNullOrWhiteSpace(advisory.Recommendation));

        var workflow = Assert.Single(advisory.Workflows);
        var validationExecution = workflow.Executions.Single(e => e.AgentName == "ValidationAgent");
        Assert.Equal(ExecutionStatus.Failed, validationExecution.Status);
        Assert.Contains("boom", validationExecution.OutputData!);
        Assert.DoesNotContain("at AgriLink", validationExecution.OutputData!);
    }

    [Fact]
    public async Task RunPipelineAsync_WeatherAgentNotPlanned_NoWeatherExecutionRow()
    {
        using var db = CreateDb();
        var notifications = new Mock<INotificationService>();
        var planner = new Mock<IPlannerAgent>();
        var cropAgent = new Mock<ICropAnalysisAgent>();
        var weatherAgent = new Mock<IWeatherAgent>();
        var validationAgent = new Mock<IValidationAgent>();

        planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false });
        cropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CropFindings());
        validationAgent.Setup(v => v.ValidateAsync(
                It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        var orchestrator = CreateOrchestrator(db, notifications, planner, cropAgent, weatherAgent, validationAgent);

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), CancellationToken.None);

        var workflow = Assert.Single(advisory.Workflows);
        Assert.DoesNotContain(workflow.Executions, e => e.AgentName == "WeatherAgent");
        weatherAgent.Verify(
            w => w.GetWeatherFindingsAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RunPipelineAsync_NotifiesOnlyOfficersInMatchingDistrict()
    {
        using var db = CreateDb();
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = 100, Department = "Agriculture", District = "Colombo" },
            new OfficerProfile { OfficerProfileId = 2, UserId = 200, Department = "Agriculture", District = "Kandy" });
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        var planner = new Mock<IPlannerAgent>();
        var cropAgent = new Mock<ICropAnalysisAgent>();
        var weatherAgent = new Mock<IWeatherAgent>();
        var validationAgent = new Mock<IValidationAgent>();

        planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false });
        cropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CropFindings());
        validationAgent.Setup(v => v.ValidateAsync(
                It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResult());

        var orchestrator = CreateOrchestrator(db, notifications, planner, cropAgent, weatherAgent, validationAgent);

        await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop("Colombo"), Array.Empty<CropActivity>(), CancellationToken.None);

        notifications.Verify(n => n.NotifyAsync(100, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        notifications.Verify(n => n.NotifyAsync(200, It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
