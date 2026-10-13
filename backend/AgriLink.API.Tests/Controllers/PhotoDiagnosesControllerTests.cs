using System.IO.Compression;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Controllers;

/// <summary>Officers' confirmed photo diagnoses: the model-vs-officer summary, and the labelled
/// photo export used to retrain the models.</summary>
public class PhotoDiagnosesControllerTests
{
    private readonly Dictionary<string, byte[]> _stored = new();
    private readonly Mock<IImageStorageService> _storage = new();

    public PhotoDiagnosesControllerTests()
    {
        _storage
            .Setup(s => s.OpenReadAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string key, CancellationToken _) =>
                _stored.TryGetValue(key, out var bytes) ? new MemoryStream(bytes) : throw new FileNotFoundException(key));
    }

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private PhotoDiagnosesController CreateController(AgriLinkDbContext db) =>
        new(db, _storage.Object, new DiseaseKnowledgeBase(), NullLogger<PhotoDiagnosesController>.Instance);

    private int _nextId;

    /// <summary>A photo issue whose advisories were reviewed with these (predicted, confirmed) keys,
    /// in order; returns the issue id.</summary>
    private int AddReviewedIssue(
        AgriLinkDbContext db, string crop, params (string Predicted, string? Confirmed, int ReviewedHoursAgo)[] reviews)
    {
        var id = ++_nextId;
        var issue = new CropIssue
        {
            IssueId = id,
            FarmerProfileId = 1,
            Title = $"Issue {id}",
            Description = "d",
            Crop = new Crop
            {
                CropId = id,
                CropType = crop,
                Field = new Field { FieldId = id, Name = "F", Farm = new Farm { FarmId = id, Name = "Farm", District = "Kandy", FarmerProfileId = 1 } },
            },
            Images = { new IssueImage { ImageId = id, StorageKey = $"issues/{id}.jpg", ContentType = "image/jpeg" } },
        };
        var advisoryId = id * 10;
        foreach (var review in reviews)
        {
            issue.Advisories.Add(new AIAdvisory
            {
                AdvisoryId = advisoryId++,
                Status = AdvisoryStatus.Approved,
                PredictedDiseaseKey = review.Predicted,
                ConfirmedDiseaseKey = review.Confirmed,
                ModelConfidence = 0.61f,
                ModelVersion = $"{crop.ToLowerInvariant()}-test",
                ReviewedAt = DateTime.UtcNow.AddHours(-review.ReviewedHoursAgo),
            });
        }

        db.CropIssues.Add(issue);
        _stored[$"issues/{id}.jpg"] = new byte[] { 0xFF, 0xD8, (byte)id };
        return id;
    }

    [Fact]
    public async Task Summary_ComparesTheModelWithTheOfficer_PerCropModel()
    {
        using var db = CreateDb();
        AddReviewedIssue(db, "Paddy", ("paddy_blast", "paddy_blast", 5));
        AddReviewedIssue(db, "Paddy", ("paddy_bacterial_leaf_blight", "paddy_tungro", 5));
        AddReviewedIssue(db, "Paddy", ("paddy_bacterial_leaf_blight", "paddy_tungro", 5));
        AddReviewedIssue(db, "Paddy", ("paddy_hispa", "other", 5));
        AddReviewedIssue(db, "Cassava", ("cassava_mosaic_disease", "cassava_mosaic_disease", 5));
        await db.SaveChangesAsync();

        var summary = Assert.IsType<PhotoDiagnosisSummaryResponse>(
            Assert.IsType<OkObjectResult>((await CreateController(db).Summary(CancellationToken.None)).Result).Value);

        Assert.Equal(5, summary.TotalReviewed);
        Assert.Equal(5, summary.PhotosAvailable);
        Assert.Equal(new[] { "Cassava", "Paddy" }, summary.Models.Select(m => m.Crop));
        var paddy = summary.Models.Single(m => m.Crop == "Paddy");
        Assert.Equal("paddy-test", paddy.ModelVersion);
        Assert.Equal(4, paddy.Reviewed);
        Assert.Equal(1, paddy.Agreed);
        Assert.Equal(0.25, paddy.AgreementRate);
        Assert.Equal(1, paddy.ConfirmedOther);
        var top = paddy.TopCorrections.First();
        Assert.Equal(2, top.Count);
        Assert.Equal("Paddy bacterial leaf blight", top.PredictedName);
        Assert.Equal("Paddy tungro", top.ConfirmedName);
    }

    [Fact]
    public async Task Summary_UsesOnlyTheLatestReviewOfARevisedIssue_AndIgnoresTextOnlyIssues()
    {
        using var db = CreateDb();
        AddReviewedIssue(db, "Tomato",
            ("tomato_early_blight", "tomato_early_blight", 30),
            ("tomato_early_blight", "tomato_late_blight", 2));
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 99, FarmerProfileId = 1, Title = "No photo", Description = "d",
            Crop = new Crop { CropId = 99, CropType = "Tomato", Field = new Field { FieldId = 99, Name = "F", Farm = new Farm { FarmId = 99, Name = "Farm", District = "Kandy" } } },
            Advisories = { new AIAdvisory { AdvisoryId = 990, Status = AdvisoryStatus.Approved, ReviewedAt = DateTime.UtcNow } },
        });
        await db.SaveChangesAsync();

        var summary = Assert.IsType<PhotoDiagnosisSummaryResponse>(
            Assert.IsType<OkObjectResult>((await CreateController(db).Summary(CancellationToken.None)).Result).Value);

        var tomato = Assert.Single(summary.Models);
        Assert.Equal(1, tomato.Reviewed);
        Assert.Equal(0, tomato.Agreed);
    }

    [Fact]
    public async Task Export_FilesEachPhotoUnderItsConfirmedDisease_WithLabelsAndNoPersonalDetails()
    {
        using var db = CreateDb();
        var agreed = AddReviewedIssue(db, "Paddy", ("paddy_blast", "paddy_blast", 5));
        var corrected = AddReviewedIssue(db, "Paddy", ("paddy_bacterial_leaf_blight", "paddy_tungro", 5));
        await db.SaveChangesAsync();

        var result = Assert.IsType<FileStreamResult>(await CreateController(db).Export(CancellationToken.None));
        Assert.Equal("application/zip", result.ContentType);
        using var zip = new ZipArchive(result.FileStream, ZipArchiveMode.Read);

        var names = zip.Entries.Select(e => e.FullName).ToList();
        Assert.Contains($"Paddy/paddy_blast/{agreed}-{agreed}.jpg", names);
        Assert.Contains($"Paddy/paddy_tungro/{corrected}-{corrected}.jpg", names);
        Assert.Contains("README.txt", names);

        using var photo = new MemoryStream();
        await zip.GetEntry($"Paddy/paddy_tungro/{corrected}-{corrected}.jpg")!.Open().CopyToAsync(photo);
        Assert.Equal(_stored[$"issues/{corrected}.jpg"], photo.ToArray());

        var labels = await new StreamReader(zip.GetEntry("labels.csv")!.Open()).ReadToEndAsync();
        var lines = labels.TrimEnd('\n').Split('\n');
        Assert.Equal("path,crop,confirmed_key,predicted_key,agreed,model_confidence,model_version,district,reviewed_at,issue_id,image_id", lines[0]);
        Assert.Equal(3, lines.Length);
        Assert.StartsWith($"Paddy/paddy_tungro/{corrected}-{corrected}.jpg,Paddy,paddy_tungro,paddy_bacterial_leaf_blight,false,0.61,paddy-test,Kandy,", lines[2]);
        Assert.DoesNotContain("Issue ", labels); // no report titles, names or contact details
    }

    [Fact]
    public async Task Export_APhotoMissingFromStorage_IsLeftOutAndCounted_NotAFailure()
    {
        using var db = CreateDb();
        AddReviewedIssue(db, "Paddy", ("paddy_blast", "paddy_blast", 5));
        var lost = AddReviewedIssue(db, "Paddy", ("paddy_hispa", "paddy_hispa", 5));
        _stored.Remove($"issues/{lost}.jpg");
        await db.SaveChangesAsync();

        var result = Assert.IsType<FileStreamResult>(await CreateController(db).Export(CancellationToken.None));
        using var zip = new ZipArchive(result.FileStream, ZipArchiveMode.Read);

        Assert.DoesNotContain(zip.Entries, e => e.FullName.StartsWith("Paddy/paddy_hispa/"));
        var readme = await new StreamReader(zip.GetEntry("README.txt")!.Open()).ReadToEndAsync();
        Assert.Contains("1 photos.", readme);
        Assert.Contains("1 recorded photos could not be read", readme);
    }
}
