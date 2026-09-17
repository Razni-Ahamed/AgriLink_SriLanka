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
using SkiaSharp;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// Reporting an issue with an optional photo: the photo is validated before anything is stored,
/// a storage outage fails cleanly, and a photo is never left orphaned in storage when the issue
/// itself doesn't get saved.
/// </summary>
public class IssuesControllerCreatePhotoTests
{
    private const int FarmerUserId = 10;
    private const int OtherFarmerUserId = 11;
    private const string StoredKey = "issues/0123456789abcdef0123456789abcdef.jpg";

    private readonly Mock<IAgentOrchestrator> _orchestrator = new();
    private readonly Mock<IImageStorageService> _storage = new();

    public IssuesControllerCreatePhotoTests()
    {
        _orchestrator
            .Setup(o => o.RunPipelineAsync(It.IsAny<CropIssue>(), It.IsAny<Crop>(),
                It.IsAny<IReadOnlyList<CropActivity>>(), It.IsAny<byte[]?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new AIAdvisory { Status = AdvisoryStatus.Draft, Recommendation = "Inspect the leaves." });

        _storage
            .Setup(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(StoredKey);
    }

    private static AgriLinkDbContext SeedFarmerWithCrop()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = FarmerUserId, NIC = "1", District = "Kandy" });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 2, UserId = OtherFarmerUserId, NIC = "2", District = "Kandy" });
        db.Crops.Add(new Crop
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
        });

        db.SaveChanges();
        return db;
    }

    private IssuesController CreateController(AgriLinkDbContext db, int actingUserId = FarmerUserId) =>
        new(
            db,
            new CurrentUserService(db),
            _orchestrator.Object,
            new IssuePhotoProcessor(),
            _storage.Object,
            NullLogger<IssuesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, "Farmer"),
                },
            },
        };

    private static CreateCropIssueWithPhotoRequest Request(IFormFile? photo) => new()
    {
        CropId = 1,
        Title = "Yellow mottled leaves",
        Description = "Leaves are twisted with yellow patches.",
        Severity = IssueSeverity.Medium,
        Photo = photo,
    };

    private static IFormFile PngPhoto()
    {
        using var bitmap = new SKBitmap(64, 48);
        bitmap.Erase(SKColors.ForestGreen);
        using var data = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        var bytes = data.ToArray();
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "Photo", "leaf.png");
    }

    private static IFormFile FileWithBytes(byte[] bytes, long? reportedLength = null) =>
        new FormFile(new MemoryStream(bytes), 0, reportedLength ?? bytes.Length, "Photo", "leaf.jpg");

    [Fact]
    public async Task Create_WithoutPhoto_SavesIssue_AndNeverTouchesStorage()
    {
        var db = SeedFarmerWithCrop();

        var result = await CreateController(db).Create(Request(photo: null));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        Assert.Single(db.CropIssues);
        Assert.Empty(db.IssueImages);
        _storage.VerifyNoOtherCalls();
        _orchestrator.Verify(o => o.RunPipelineAsync(
            It.IsAny<CropIssue>(), It.IsAny<Crop>(), It.IsAny<IReadOnlyList<CropActivity>>(),
            null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateWithPhoto_StoresReencodedJpeg_AndRecordsItOnTheIssue()
    {
        var db = SeedFarmerWithCrop();

        var result = await CreateController(db).CreateWithPhoto(Request(PngPhoto()));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        _storage.Verify(s => s.SaveAsync(
            It.Is<byte[]>(bytes => bytes[0] == 0xFF && bytes[1] == 0xD8),
            "image/jpeg",
            It.IsAny<CancellationToken>()), Times.Once);
        // The agents classify the same processed JPEG that was stored, not the raw upload.
        _orchestrator.Verify(o => o.RunPipelineAsync(
            It.IsAny<CropIssue>(), It.IsAny<Crop>(), It.IsAny<IReadOnlyList<CropActivity>>(),
            It.Is<byte[]?>(bytes => bytes != null && bytes[0] == 0xFF && bytes[1] == 0xD8),
            It.IsAny<CancellationToken>()), Times.Once);

        var image = Assert.Single(db.IssueImages);
        Assert.Equal(StoredKey, image.StorageKey);
        Assert.Equal("image/jpeg", image.ContentType);
        Assert.Equal((64, 48), (image.Width, image.Height));
        Assert.Equal(db.CropIssues.Single().IssueId, image.IssueId);
    }

    [Fact]
    public async Task CreateWithPhoto_NoFileAttached_IsHandledLikeAPlainReport()
    {
        var db = SeedFarmerWithCrop();

        var result = await CreateController(db).CreateWithPhoto(Request(photo: null));

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        Assert.Empty(db.IssueImages);
        _storage.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateWithPhoto_FileThatIsNotAnImage_Returns400_AndSavesNothing()
    {
        var db = SeedFarmerWithCrop();

        var result = await CreateController(db).CreateWithPhoto(Request(FileWithBytes("not an image"u8.ToArray())));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.CropIssues);
        _storage.VerifyNoOtherCalls();
        _orchestrator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateWithPhoto_PhotoOverTheSizeLimit_Returns400_WithoutReadingIt()
    {
        var db = SeedFarmerWithCrop();
        var oversized = FileWithBytes(new byte[] { 0xFF, 0xD8, 0xFF }, reportedLength: IssuePhotoProcessor.MaxUploadBytes + 1);

        var result = await CreateController(db).CreateWithPhoto(Request(oversized));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.CropIssues);
        _storage.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateWithPhoto_StorageUnavailable_Returns503_AndSavesNothing()
    {
        var db = SeedFarmerWithCrop();
        _storage
            .Setup(s => s.SaveAsync(It.IsAny<byte[]>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ImageStorageException("provider down"));

        var result = await CreateController(db).CreateWithPhoto(Request(PngPhoto()));

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        Assert.Empty(db.CropIssues);
        _orchestrator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CreateWithPhoto_PipelineFailsAfterUpload_DeletesTheStoredPhoto()
    {
        var db = SeedFarmerWithCrop();
        _orchestrator
            .Setup(o => o.RunPipelineAsync(It.IsAny<CropIssue>(), It.IsAny<Crop>(),
                It.IsAny<IReadOnlyList<CropActivity>>(), It.IsAny<byte[]?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(() => CreateController(db).CreateWithPhoto(Request(PngPhoto())));

        _storage.Verify(s => s.DeleteAsync(StoredKey, CancellationToken.None), Times.Once);
        Assert.Empty(db.CropIssues);
    }

    [Fact]
    public async Task CreateWithPhoto_OnAnotherFarmersCrop_IsForbidden_BeforeThePhotoIsStored()
    {
        var db = SeedFarmerWithCrop();

        var result = await CreateController(db, actingUserId: OtherFarmerUserId).CreateWithPhoto(Request(PngPhoto()));

        Assert.IsType<ForbidResult>(result.Result);
        _storage.VerifyNoOtherCalls();
    }
}
