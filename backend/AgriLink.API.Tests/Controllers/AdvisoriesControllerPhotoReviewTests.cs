using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Advisories;
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
/// Officer review of a photo diagnosis: approving confirms the model's disease, rejecting corrects it,
/// and in both cases the officer — not the model — decides what the farmer is told to do.
/// </summary>
public class AdvisoriesControllerPhotoReviewTests
{
    private const int FarmerUserId = 1;
    private const int OtherFarmerUserId = 2;
    private const int OfficerUserId = 5;
    private const string Mosaic = "cassava_mosaic_disease";
    private const string BrownStreak = "cassava_brown_streak_disease";

    private readonly Mock<INotificationService> _notifications = new();

    private static AgriLinkDbContext SeedPhotoAdvisory(AdvisoryStatus status, bool photoDiagnosis = true)
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        db.Users.AddRange(
            new ApplicationUser { Id = FarmerUserId, UserName = "farmer@test.com", Email = "farmer@test.com", FullName = "Test Farmer" },
            new ApplicationUser { Id = OtherFarmerUserId, UserName = "other@test.com", Email = "other@test.com", FullName = "Other Farmer" },
            new ApplicationUser { Id = OfficerUserId, UserName = "officer@test.com", Email = "officer@test.com", FullName = "Officer Perera" });
        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = 2, UserId = OtherFarmerUserId, NIC = "2", District = "Kandy" });

        var issue = new CropIssue
        {
            IssueId = 1,
            FarmerProfileId = 1,
            Crop = new Crop
            {
                CropId = 1,
                CropType = "Cassava",
                Variety = "MU 51",
                Field = new Field
                {
                    FieldId = 1,
                    Name = "North Field",
                    Farm = new Farm { FarmId = 1, Name = "Green Acres", District = "Kandy", FarmerProfileId = 1 },
                },
            },
            Title = "Yellow mottled leaves",
            Description = "Leaves are twisted with yellow patches.",
            Status = IssueStatus.AwaitingReview,
            Images = { new IssueImage { ImageId = 7, StorageKey = "issues/a.jpg", ContentType = "image/jpeg", Width = 800, Height = 600 } },
        };

        db.AIAdvisories.Add(new AIAdvisory
        {
            AdvisoryId = 1,
            Issue = issue,
            Status = status,
            RiskLevel = RiskLevel.Medium,
            Recommendation = "Likely cause(s): Cassava mosaic disease.",
            ConfidenceScore = 0.7f,
            PredictedDiseaseKey = photoDiagnosis ? Mosaic : null,
            ModelConfidence = photoDiagnosis ? 0.97f : null,
            ModelVersion = photoDiagnosis ? "cassava-test" : null,
            EscalationReasons = photoDiagnosis && status == AdvisoryStatus.Draft ? "SeriousDisease,NoApprovedTreatment" : null,
        });
        db.SaveChanges();
        return db;
    }

    private AdvisoriesController CreateController(AgriLinkDbContext db, int userId = OfficerUserId, string role = "Officer") => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db),
        _notifications.Object,
        new DiseaseKnowledgeBase())
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
        },
    };

    private static string Message(ActionResult<AdvisoryResponse> result)
    {
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        return (string)badRequest.Value!.GetType().GetProperty("message")!.GetValue(badRequest.Value)!;
    }

    private void VerifyFarmerNotified(string titleFragment) =>
        _notifications.Verify(n => n.NotifyAsync(FarmerUserId, It.Is<string>(t => t.Contains(titleFragment)), It.IsAny<string>()), Times.Once);

    // ----- Approve -----

    [Fact]
    public async Task Approve_PreliminaryAdvice_WithoutTreatment_ConfirmsThePredictedDisease()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);

        var result = await CreateController(db).Approve(1);

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(nameof(AdvisoryStatus.Approved), response.Status);
        Assert.Equal(Mosaic, response.ConfirmedDiseaseKey);
        Assert.Equal("Cassava mosaic disease", response.ConfirmedDiseaseName);
        Assert.Null(response.OfficerTreatment);
        Assert.Equal(IssueStatus.Resolved, db.CropIssues.Single().Status);
        Assert.Equal(nameof(AdvisoryStatus.Preliminary), db.AuditLogs.Single().OldValue);
        VerifyFarmerNotified("confirmed");
    }

    [Fact]
    public async Task Approve_HeldBackPhotoDiagnosis_WithoutTreatment_IsRefused()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db).Approve(1);

        Assert.Contains("add the treatment", Message(result));
        Assert.Equal(AdvisoryStatus.Draft, db.AIAdvisories.Single().Status);
        _notifications.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Approve_HeldBackPhotoDiagnosis_WithTreatment_GivesTheFarmerTheOfficersAdvice()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db).Approve(1, new ReviewAdvisoryRequest { Treatment = "  Uproot infected plants.  " });

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Uproot infected plants.", response.OfficerTreatment);
        Assert.Equal(Mosaic, response.ConfirmedDiseaseKey);
        Assert.Equal(IssueStatus.Resolved, db.CropIssues.Single().Status);
        VerifyFarmerNotified("approved");
    }

    [Fact]
    public async Task Approve_WithADifferentDisease_IsRefused_InFavourOfRejecting()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);

        var result = await CreateController(db).Approve(1, new ReviewAdvisoryRequest { DiseaseKey = BrownStreak });

        Assert.Contains("reject it", Message(result));
    }

    // ----- Reject (correct) -----

    [Theory]
    [InlineData(null, "Plant clean cuttings.", "Choose the correct disease")]
    [InlineData("cassava_rust", "Plant clean cuttings.", "not a known disease")]
    [InlineData(BrownStreak, null, "Add the treatment")]
    [InlineData(BrownStreak, "   ", "Add the treatment")]
    public async Task Reject_PhotoDiagnosis_NeedsAKnownDiseaseAndATreatment(string? diseaseKey, string? treatment, string expectedMessage)
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db).Reject(1, new ReviewAdvisoryRequest { DiseaseKey = diseaseKey, Treatment = treatment });

        Assert.Contains(expectedMessage, Message(result));
        Assert.Equal(AdvisoryStatus.Draft, db.AIAdvisories.Single().Status);
    }

    [Fact]
    public async Task Reject_PreliminaryAdvice_WithCorrection_ResolvesTheIssueAndTellsTheFarmerTheAdviceChanged()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);

        var result = await CreateController(db).Reject(1, new ReviewAdvisoryRequest
        {
            DiseaseKey = BrownStreak,
            Treatment = "Destroy affected plants and use certified cuttings.",
            Note = "Root necrosis confirmed on inspection.",
        });

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(nameof(AdvisoryStatus.Rejected), response.Status);
        Assert.Equal(BrownStreak, response.ConfirmedDiseaseKey);
        Assert.Equal("Cassava brown streak disease", response.ConfirmedDiseaseName);
        Assert.Equal("Destroy affected plants and use certified cuttings.", response.OfficerTreatment);
        Assert.Equal(IssueStatus.Resolved, db.CropIssues.Single().Status);
        _notifications.Verify(n => n.NotifyAsync(
            FarmerUserId,
            It.Is<string>(t => t.Contains("updated")),
            It.Is<string>(m => m.Contains("instead of the earlier suggestion") && m.Contains("Root necrosis confirmed"))), Times.Once);
    }

    [Fact]
    public async Task Reject_WithOther_AcceptsADiseaseOutsideTheModelsClasses()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db).Reject(1, new ReviewAdvisoryRequest
        {
            DiseaseKey = DiseaseKnowledgeEntry.OtherKey,
            Treatment = "Send a leaf sample to the regional lab.",
        });

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(DiseaseKnowledgeEntry.OtherKey, response.ConfirmedDiseaseKey);
        Assert.Equal(DiseaseKnowledgeEntry.OtherDisplayName, response.ConfirmedDiseaseName);
    }

    [Theory]
    [InlineData(AdvisoryStatus.Approved)]
    [InlineData(AdvisoryStatus.Rejected)]
    public async Task Review_AnAdvisoryAlreadyDecided_IsRefused(AdvisoryStatus status)
    {
        using var db = SeedPhotoAdvisory(status);

        var result = await CreateController(db).Approve(1, new ReviewAdvisoryRequest { Treatment = "x" });

        Assert.Contains("awaiting review", Message(result));
    }

    // ----- Advisories without a photo diagnosis keep their old rules -----

    [Fact]
    public async Task TextAdvisory_ApproveAndRejectNeedNoTreatment_AndABareRejectStillRejectsTheIssue()
    {
        using var approveDb = SeedPhotoAdvisory(AdvisoryStatus.Draft, photoDiagnosis: false);
        Assert.IsType<OkObjectResult>((await CreateController(approveDb).Approve(1)).Result);

        using var rejectDb = SeedPhotoAdvisory(AdvisoryStatus.Draft, photoDiagnosis: false);
        var rejected = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>((await CreateController(rejectDb).Reject(1)).Result).Value);

        Assert.Null(rejected.ConfirmedDiseaseKey);
        Assert.Equal(IssueStatus.Rejected, rejectDb.CropIssues.Single().Status);
    }

    // ----- Who sees what -----

    [Fact]
    public async Task Farmer_SeesTheirPreliminaryAdvice_WithDiagnosisAndPhotos_ButNoReviewerDetails()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);

        var result = await CreateController(db, FarmerUserId, "Farmer").GetById(1);

        var response = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Cassava mosaic disease", response.PhotoDiagnosis!.DiseaseName);
        Assert.Null(response.PhotoDiagnosis.ModelConfidence);
        Assert.Null(response.PhotoDiagnosis.EscalationReasons);
        Assert.Null(response.PhotoDiagnosis.DiseaseOptions);
        Assert.Null(response.AgentTrace);
        var photo = Assert.Single(response.Photos);
        Assert.Equal("/api/issues/1/images/7", photo.Url);
    }

    [Fact]
    public async Task Farmer_CannotSeeAHeldBackDraft()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db, FarmerUserId, "Farmer").GetById(1);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task AnotherFarmer_CannotSeeThePreliminaryAdvice()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);

        var result = await CreateController(db, OtherFarmerUserId, "Farmer").GetById(1);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task Officer_SeesTheKnowledgeBaseAdviceAsAStartingPoint_AndTheFarmerDoesNot()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Preliminary);
        var expected = new DiseaseKnowledgeBase().Find("Cassava", Mosaic)!.Treatment;

        var officerView = Assert.IsType<AdvisoryResponse>(
            Assert.IsType<OkObjectResult>((await CreateController(db).GetById(1)).Result).Value);
        var farmerView = Assert.IsType<AdvisoryResponse>(
            Assert.IsType<OkObjectResult>((await CreateController(db, FarmerUserId, "Farmer").GetById(1)).Result).Value);

        Assert.False(string.IsNullOrWhiteSpace(expected));
        Assert.Equal(expected, officerView.PhotoDiagnosis!.SuggestedTreatment);
        // It is a suggestion for the officer, not advice the farmer has been given.
        Assert.Null(farmerView.PhotoDiagnosis!.SuggestedTreatment);
        Assert.Null(farmerView.OfficerTreatment);
    }

    [Fact]
    public async Task Officer_SeesConfidenceEscalationReasonsAndCorrectionOptions()
    {
        using var db = SeedPhotoAdvisory(AdvisoryStatus.Draft);

        var result = await CreateController(db).GetById(1);

        var diagnosis = Assert.IsType<AdvisoryResponse>(Assert.IsType<OkObjectResult>(result.Result).Value).PhotoDiagnosis!;
        Assert.Equal(0.97f, diagnosis.ModelConfidence);
        Assert.Equal("cassava-test", diagnosis.ModelVersion);
        Assert.Equal(new[] { EscalationReason.SeriousDisease, EscalationReason.NoApprovedTreatment }, diagnosis.EscalationReasons);
        Assert.Equal(
            new DiseaseKnowledgeBase().ForCrop("Cassava").Select(d => d.Key).Append(DiseaseKnowledgeEntry.OtherKey),
            diagnosis.DiseaseOptions!.Select(o => o.Key));
    }
}
