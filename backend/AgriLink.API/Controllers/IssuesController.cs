using AgriLink.API.Data;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    // The 5 MB photo plus the text fields and multipart framing.
    private const long MultipartRequestLimitBytes = IssuePhotoProcessor.MaxUploadBytes + 64 * 1024;

    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAgentOrchestrator _orchestrator;
    private readonly IIssuePhotoProcessor _photoProcessor;
    private readonly IImageStorageService _imageStorage;
    private readonly ILogger<IssuesController> _logger;

    public IssuesController(
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAgentOrchestrator orchestrator,
        IIssuePhotoProcessor photoProcessor,
        IImageStorageService imageStorage,
        ILogger<IssuesController> logger)
    {
        _db = db;
        _currentUser = currentUser;
        _orchestrator = orchestrator;
        _photoProcessor = photoProcessor;
        _imageStorage = imageStorage;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Farmer")]
    public Task<ActionResult<CropIssueResponse>> Create([FromBody] CreateCropIssueRequest request) =>
        CreateIssueAsync(request, photo: null);

    /// <summary>
    /// Same as <see cref="Create"/>, sent as multipart/form-data so a photo can be attached. The
    /// JSON endpoint stays so clients that never send photos keep working unchanged. It has its own
    /// path because OpenAPI (and so Swagger) cannot describe two POST actions on one path.
    /// </summary>
    [HttpPost("with-photo")]
    [Authorize(Roles = "Farmer")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MultipartRequestLimitBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MultipartRequestLimitBytes)]
    public Task<ActionResult<CropIssueResponse>> CreateWithPhoto([FromForm] CreateCropIssueWithPhotoRequest request) =>
        CreateIssueAsync(request, request.Photo);

    private async Task<ActionResult<CropIssueResponse>> CreateIssueAsync(CreateCropIssueRequest request, IFormFile? photo)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var crop = await _db.Crops
            .Include(c => c.Field)
            .ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(c => c.CropId == request.CropId);

        if (crop is null)
        {
            return NotFound(new { message = "Crop not found." });
        }

        if (crop.Field.Farm.FarmerProfileId != farmerProfileId)
        {
            return Forbid();
        }

        ProcessedPhoto? processedPhoto = null;
        if (photo is not null)
        {
            // Checked before reading, so an oversized upload is never buffered into memory.
            if (photo.Length > IssuePhotoProcessor.MaxUploadBytes)
            {
                return BadRequest(new { message = "The photo is larger than 5 MB." });
            }

            try
            {
                processedPhoto = _photoProcessor.Process(await ReadAllBytesAsync(photo, HttpContext.RequestAborted));
            }
            catch (InvalidPhotoException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var recentActivities = await _db.CropActivities
            .Where(a => a.CropId == request.CropId && a.ActivityDate >= since)
            .ToListAsync();

        var issue = new CropIssue
        {
            CropId = request.CropId,
            FarmerProfileId = farmerProfileId.Value,
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Status = IssueStatus.AwaitingReview,
        };

        string? storageKey = null;
        if (processedPhoto is not null)
        {
            try
            {
                storageKey = await _imageStorage.SaveAsync(
                    processedPhoto.Content, processedPhoto.ContentType, HttpContext.RequestAborted);
            }
            catch (ImageStorageException ex)
            {
                // A storage outage is not the farmer's fault; say so, and offer the no-photo path.
                _logger.LogError(ex, "Storing an issue photo failed");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The photo could not be uploaded right now. Please try again, or submit the report without a photo.",
                });
            }

            issue.Images.Add(new IssueImage
            {
                StorageKey = storageKey,
                ContentType = processedPhoto.ContentType,
                SizeBytes = processedPhoto.Content.Length,
                Width = processedPhoto.Width,
                Height = processedPhoto.Height,
            });
        }

        try
        {
            var advisory = await _orchestrator.RunPipelineAsync(
                issue, crop, recentActivities, processedPhoto?.Content, HttpContext.RequestAborted);
            issue.Advisories.Add(advisory);

            issue.Crop = crop;
            _db.CropIssues.Add(issue);
            await _db.SaveChangesAsync();
        }
        catch (Exception) when (storageKey is not null)
        {
            // The photo is already stored but no issue will reference it — remove it rather than
            // leave an orphan in storage, then let the original failure surface as before.
            await DeleteOrphanedPhotoAsync(storageKey);
            throw;
        }

        return StatusCode(StatusCodes.Status201Created, ToResponse(issue));
    }

    private static async Task<byte[]> ReadAllBytesAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var source = file.OpenReadStream();
        using var buffer = new MemoryStream((int)file.Length);
        await source.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }

    private async Task DeleteOrphanedPhotoAsync(string storageKey)
    {
        try
        {
            // Not tied to the request: this also runs when the farmer's request was aborted.
            await _imageStorage.DeleteAsync(storageKey, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not delete orphaned issue photo {StorageKey}", storageKey);
        }
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<CropIssueResponse>>> Mine()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Where(i => i.FarmerProfileId == farmerProfileId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(i => ToResponse(i, includeReporter: false)));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Officer,Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> Pending()
    {
        var query = _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Where(i => i.Advisories.Any(a => a.Status == AdvisoryStatus.Draft || a.Status == AdvisoryStatus.Preliminary));

        // Scoped to the calling officer's own district — the same district
        // AgentOrchestrator.NotifyOfficersAsync already used to decide who gets notified about
        // a new issue. Without this, every officer saw every district's queue, which disagreed
        // with what they'd actually been notified about. Admin keeps the unscoped, nationwide
        // view its own oversight role calls for.
        if (!_currentUser.IsAdmin(User))
        {
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            query = query.Where(i => i.Crop.Field.Farm.District == district);
        }

        var issues = await query.OrderBy(i => i.CreatedAt).ToListAsync();

        // Cases the farmer has had no advice on yet (Draft) come first; Preliminary advice has
        // already reached the farmer and is waiting for confirmation. Oldest first within each.
        var ordered = issues.OrderBy(i => LatestAdvisory(i)?.Status == AdvisoryStatus.Preliminary ? 1 : 0);

        return Ok(ordered.Select(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>
    /// A photo attached to an issue, streamed from storage. Only the reporting farmer and
    /// officers/admins may see it; the response is an image, not a public link.
    /// </summary>
    [HttpGet("{issueId:int}/images/{imageId:int}")]
    public async Task<IActionResult> GetImage(int issueId, int imageId)
    {
        var image = await _db.IssueImages
            .Include(i => i.Issue)
            .FirstOrDefaultAsync(i => i.ImageId == imageId && i.IssueId == issueId);
        if (image is null)
        {
            return NotFound();
        }

        if (!User.IsInRole("Officer") && !User.IsInRole("Admin"))
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null || image.Issue.FarmerProfileId != farmerProfileId)
            {
                return Forbid();
            }
        }

        try
        {
            var content = await _imageStorage.OpenReadAsync(image.StorageKey, HttpContext.RequestAborted);
            // Photos never change once stored; private so shared caches never hold a farmer's photo.
            Response.Headers.CacheControl = "private, max-age=86400";
            return File(content, image.ContentType);
        }
        catch (FileNotFoundException)
        {
            _logger.LogWarning("Issue photo {ImageId} is recorded but missing from storage", imageId);
            return NotFound();
        }
        catch (ImageStorageException ex)
        {
            _logger.LogError(ex, "Reading issue photo {ImageId} failed", imageId);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "The photo could not be loaded right now." });
        }
    }

    /// <summary>
    /// Issues the calling officer has personally reviewed (approved or rejected), most recent
    /// first — their own decision history. Before this there was no way for an officer to see
    /// anything once it left the Draft-only Pending queue; Admin got a full oversight
    /// equivalent (GetAll) but nothing scoped to one officer's own past decisions existed.
    /// </summary>
    [HttpGet("reviewed")]
    [Authorize(Roles = "Officer")]
    public async Task<ActionResult<List<CropIssueResponse>>> Reviewed()
    {
        var userId = _currentUser.GetUserId(User);

        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Where(i => i.Advisories.Any(a => a.ReviewedByFK == userId))
            .ToListAsync();

        // OrderByDescending on the reviewed advisory's timestamp, not the issue's — sorting by
        // when it was reviewed (not when it was reported) is what makes this "recent activity"
        // rather than just Pending() with an extra filter.
        var ordered = issues
            .OrderByDescending(i => i.Advisories
                .Where(a => a.ReviewedByFK == userId)
                .Max(a => a.ReviewedAt));

        return Ok(ordered.Select(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>Every issue ever reported, any status — Admin's full oversight view, not just
    /// the Officer's Draft-advisory work queue.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> GetAll()
    {
        var issues = await _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(i => ToResponse(i, includeReporter: true)));
    }

    private static AIAdvisory? LatestAdvisory(CropIssue issue) =>
        issue.Advisories.OrderByDescending(a => a.AdvisoryId).FirstOrDefault();

    private static CropIssueResponse ToResponse(CropIssue issue, bool includeReporter = false)
    {
        var latestAdvisory = LatestAdvisory(issue);

        return new CropIssueResponse
        {
            IssueId = issue.IssueId,
            CropId = issue.CropId,
            CropType = issue.Crop?.CropType ?? string.Empty,
            Variety = issue.Crop?.Variety ?? string.Empty,
            District = issue.Crop?.Field?.Farm?.District ?? string.Empty,
            ReporterName = includeReporter ? issue.FarmerProfile?.User?.FullName ?? string.Empty : string.Empty,
            Title = issue.Title,
            Description = issue.Description,
            Severity = issue.Severity.ToString(),
            Status = issue.Status.ToString(),
            CreatedAt = issue.CreatedAt,
            AdvisoryId = latestAdvisory?.AdvisoryId,
            ReviewedAt = latestAdvisory?.ReviewedAt,
            ReviewNote = latestAdvisory?.ReviewNote,
            AdvisoryStatus = latestAdvisory?.Status.ToString(),
            HasPhoto = issue.Images.Count > 0,
        };
    }
}
