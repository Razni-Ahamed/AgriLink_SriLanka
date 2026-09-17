using AgriLink.API.Data;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        Mock<IValidationAgent> validationAgent,
        Mock<IImageClassifier>? classifier = null,
        IDiseaseKnowledgeBase? diseases = null,
        bool autoReleaseEnabled = false) => new(
            db,
            notifications.Object,
            planner.Object,
            cropAgent.Object,
            weatherAgent.Object,
            validationAgent.Object,
            (classifier ?? new Mock<IImageClassifier>()).Object,
            diseases ?? new DiseaseKnowledgeBase(),
            Options.Create(new ImageClassificationOptions { AutoReleaseEnabled = autoReleaseEnabled }),
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

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

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

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

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

        var advisory = await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

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
            new OfficerProfile { OfficerProfileId = 1, UserId = 100, DepartmentId = 1, District = "Colombo" },
            new OfficerProfile { OfficerProfileId = 2, UserId = 200, DepartmentId = 1, District = "Kandy" });
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

        await orchestrator.RunPipelineAsync(CreateIssue(), CreateCrop("Colombo"), Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

        notifications.Verify(n => n.NotifyAsync(100, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        notifications.Verify(n => n.NotifyAsync(200, It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    // ----- Photo diagnosis path -----

    private static readonly byte[] Photo = { 0xFF, 0xD8, 0xFF, 0x00 };

    private sealed class PhotoPipeline
    {
        public Mock<INotificationService> Notifications { get; } = new();
        public Mock<IPlannerAgent> Planner { get; } = new();
        public Mock<ICropAnalysisAgent> CropAgent { get; } = new();
        public Mock<IWeatherAgent> WeatherAgent { get; } = new();
        public Mock<IValidationAgent> ValidationAgent { get; } = new();
        public Mock<IImageClassifier> Classifier { get; } = new();
        public CropFindings? FindingsSentToValidation { get; private set; }

        public PhotoPipeline(string predictedKey = "cassava_mosaic_disease", double probability = 0.97, double? threshold = 0.43)
        {
            // The planner asks for crop analysis on purpose: a photo diagnosis must still skip it.
            Planner.Setup(p => p.CreatePlanAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new PlannerPlan { UseCropAgent = true, UseWeatherAgent = false });
            CropAgent.Setup(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new CropFindings());
            ValidationAgent.Setup(v => v.ValidateAsync(
                    It.IsAny<AgentContext>(), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()))
                .Callback<AgentContext, CropFindings?, WeatherFindings?, CancellationToken>((_, findings, _, _) => FindingsSentToValidation = findings)
                .ReturnsAsync(new ValidationResult { RiskLevel = RiskLevel.Medium, Recommendation = "Composed.", ConfidenceScore = 0.7f });
            Classifier.Setup(c => c.SupportsCrop("Cassava")).Returns(true);
            Classifier.Setup(c => c.ClassifyAsync("Cassava", Photo, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ImageFindings
                {
                    Crop = "Cassava",
                    ModelVersion = "cassava-test",
                    Predictions = new[] { new ClassPrediction(predictedKey, predictedKey, probability) },
                    AutoReleaseThreshold = threshold,
                });
        }

        public AgentOrchestrator Create(AgriLinkDbContext db, IDiseaseKnowledgeBase? diseases = null, bool autoReleaseEnabled = false) =>
            CreateOrchestrator(db, Notifications, Planner, CropAgent, WeatherAgent, ValidationAgent, Classifier, diseases, autoReleaseEnabled);
    }

    private static Crop CassavaCrop()
    {
        var crop = CreateCrop();
        crop.CropType = "Cassava";
        return crop;
    }

    private static IDiseaseKnowledgeBase KnowledgeBaseWithApprovedMosaicTreatment() => new DiseaseKnowledgeBase(new[]
    {
        new DiseaseKnowledgeEntry("Cassava", "cassava_mosaic_disease", "Cassava mosaic disease",
            IsSerious: false, Treatment: "Uproot infected plants and replant with clean cuttings.", WeatherRelated: false,
            new[] { "mosaic" }),
    });

    [Fact]
    public async Task Photo_OfSupportedCrop_IsClassifiedAndTriaged_InsteadOfKeywordCropAnalysis()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        var workflow = Assert.Single(advisory.Workflows);
        Assert.Equal(
            new[] { "ImageClassificationAgent", "PlannerAgent", "PhotoTriageAgent", "ValidationAgent" },
            workflow.Executions.Select(e => e.AgentName));
        pipeline.CropAgent.Verify(c => c.AnalyzeAsync(It.IsAny<AgentContext>(), It.IsAny<CancellationToken>()), Times.Never);
        pipeline.Planner.Verify(p => p.CreatePlanAsync(
            It.Is<AgentContext>(c => c.ImageFindings != null && c.ImageFindings.Top.Key == "cassava_mosaic_disease"),
            It.IsAny<CancellationToken>()), Times.Once);

        Assert.Equal("cassava_mosaic_disease", advisory.PredictedDiseaseKey);
        Assert.Equal(0.97f, advisory.ModelConfidence);
        Assert.Equal("cassava-test", advisory.ModelVersion);
        Assert.Contains("Cassava mosaic disease", Assert.Single(pipeline.FindingsSentToValidation!.PossibleCauses));
    }

    [Fact]
    public async Task Photo_WithTheShippedKnowledgeBase_StaysADraftAndRecordsWhy()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        // The shipped entries carry drafted advice for the officer, but every disease is marked serious,
        // so the case is still held back and the farmer is given nothing.
        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        Assert.Equal(
            new[] { EscalationReason.SeriousDisease, EscalationReason.AutoReleaseDisabled },
            advisory.EscalationReasons!.Split(','));
        Assert.Empty(pipeline.FindingsSentToValidation!.RecommendedActions);
    }

    [Fact]
    public async Task Photo_CleanTriage_WithAutoReleaseEnabled_IsPreliminaryWithTheApprovedTreatment()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db, KnowledgeBaseWithApprovedMosaicTreatment(), autoReleaseEnabled: true)
            .RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Preliminary, advisory.Status);
        Assert.True(advisory.RequiresApproval);
        Assert.Null(advisory.EscalationReasons);
        Assert.Equal(
            "Uproot infected plants and replant with clean cuttings.",
            Assert.Single(pipeline.FindingsSentToValidation!.RecommendedActions));
    }

    [Fact]
    public async Task Photo_ReleasedAsPreliminary_NotifiesTheFarmer_AndAsksOfficersToConfirm()
    {
        using var db = CreateDb();
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = 42, NIC = "1", District = "Colombo" });
        db.OfficerProfiles.Add(new OfficerProfile { OfficerProfileId = 1, UserId = 100, DepartmentId = 1, District = "Colombo" });
        await db.SaveChangesAsync();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db, KnowledgeBaseWithApprovedMosaicTreatment(), autoReleaseEnabled: true)
            .RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Preliminary, advisory.Status);
        pipeline.ValidationAgent.Verify(v => v.ValidateAsync(
            It.Is<AgentContext>(c => c.AdviceReleasedBeforeReview), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()), Times.Once);
        pipeline.Notifications.Verify(n => n.NotifyAsync(42, It.Is<string>(t => t.Contains("ready")), It.IsAny<string>()), Times.Once);
        pipeline.Notifications.Verify(n => n.NotifyAsync(100, It.Is<string>(t => t.Contains("confirmation")), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Photo_HeldBackForTheOfficer_NeverNotifiesTheFarmer()
    {
        using var db = CreateDb();
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = 42, NIC = "1", District = "Colombo" });
        await db.SaveChangesAsync();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        pipeline.ValidationAgent.Verify(v => v.ValidateAsync(
            It.Is<AgentContext>(c => !c.AdviceReleasedBeforeReview), It.IsAny<CropFindings?>(), It.IsAny<WeatherFindings?>(), It.IsAny<CancellationToken>()), Times.Once);
        pipeline.Notifications.Verify(n => n.NotifyAsync(42, It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Photo_CleanTriage_WithAutoReleaseSwitchedOff_StaysADraft()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db, KnowledgeBaseWithApprovedMosaicTreatment(), autoReleaseEnabled: false)
            .RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        Assert.Equal(EscalationReason.AutoReleaseDisabled, advisory.EscalationReasons);
        Assert.Empty(pipeline.FindingsSentToValidation!.RecommendedActions);
    }

    [Fact]
    public async Task Photo_BelowTheClassThreshold_StaysADraft_EvenWithAutoReleaseEnabled()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline(probability: 0.40, threshold: 0.43);

        var advisory = await pipeline.Create(db, KnowledgeBaseWithApprovedMosaicTreatment(), autoReleaseEnabled: true)
            .RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
        Assert.Equal(EscalationReason.LowConfidence, advisory.EscalationReasons);
    }

    [Fact]
    public async Task Photo_ClassificationFails_FallsBackToTheTextAgents()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();
        pipeline.Classifier.Setup(c => c.ClassifyAsync("Cassava", Photo, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("too slow"));

        var advisory = await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        var workflow = Assert.Single(advisory.Workflows);
        Assert.Equal(ExecutionStatus.Failed, workflow.Executions.Single(e => e.AgentName == "ImageClassificationAgent").Status);
        Assert.Contains(workflow.Executions, e => e.AgentName == "CropAnalysisAgent");
        Assert.DoesNotContain(workflow.Executions, e => e.AgentName == "PhotoTriageAgent");
        Assert.Null(advisory.PredictedDiseaseKey);
        Assert.Equal(AdvisoryStatus.Draft, advisory.Status);
    }

    [Fact]
    public async Task Photo_OfCropWithoutAModel_IsNeverClassified()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        var advisory = await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CreateCrop(), Array.Empty<CropActivity>(), Photo, CancellationToken.None);

        pipeline.Classifier.Verify(c => c.ClassifyAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains(Assert.Single(advisory.Workflows).Executions, e => e.AgentName == "CropAnalysisAgent");
    }

    [Fact]
    public async Task NoPhoto_NeverConsultsTheClassifier()
    {
        using var db = CreateDb();
        var pipeline = new PhotoPipeline();

        await pipeline.Create(db).RunPipelineAsync(CreateIssue(), CassavaCrop(), Array.Empty<CropActivity>(), photo: null, CancellationToken.None);

        pipeline.Classifier.VerifyNoOtherCalls();
    }
}
