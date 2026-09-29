using System.ComponentModel.DataAnnotations;
using AgriLink.API.Common;
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
    public async Task<ActionResult<PagedResponse<CropIssueResponse>>> Mine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var query = _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Where(i => i.FarmerProfileId == farmerProfileId)
            .OrderByDescending(i => i.CreatedAt);

        var paged = await query.ToPagedResponseAsync(page, pageSize, cancellationToken);
        return Ok(paged.Map(i => ToResponse(i, includeReporter: false)));
    }

    /// <summary>
    /// The review queue. <paramref name="search"/> matches the title, description, crop, variety,
    /// district or reporter; <paramref name="sort"/> is queue (default: cases with no advice yet
    /// first, oldest first), newest, oldest or severity (High first).
    /// </summary>
    [HttpGet("pending")]
    [Authorize(Roles = "Officer,Admin")]
    public async Task<ActionResult<PagedResponse<CropIssueResponse>>> Pending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        [FromQuery, StringLength(100)] string? search = null,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
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

        query = Search(query, search);

        // "queue": cases the farmer has had no advice on yet (Draft) come first; Preliminary
        // advice has already reached the farmer and is waiting for confirmation. Oldest first
        // within each. Expressed as a correlated subquery (the latest advisory by id) so the sort —
        // and so the paging above it — happens in the database, not after loading every row.
        var ordered = (sort ?? "queue").ToLowerInvariant() == "queue"
            ? query
                .OrderBy(i => i.Advisories
                    .OrderByDescending(a => a.AdvisoryId)
                    .Select(a => a.Status)
                    .FirstOrDefault() == AdvisoryStatus.Preliminary ? 1 : 0)
                .ThenBy(i => i.CreatedAt)
            : Sort(query, sort);
        if (ordered is null)
        {
            return BadRequest(new { message = "sort must be queue, newest, oldest or severity." });
        }

        var paged = await ordered.ToPagedResponseAsync(page, pageSize, cancellationToken);
        return Ok(paged.Map(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>
    /// A photo attached to an issue, streamed from storage. Only the reporting farmer and
    /// officers/admins may see it; the response is an image, not a public link.
    /// </summary>
    [HttpGet("{issueId:int}/images/{imageId:int}")]
    public async Task<IActionResult> GetImage(int issueId, int imageId)
    {
        var image = await _db.IssueImages
            .Include(i => i.Issue).ThenInclude(issue => issue.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.Issue).ThenInclude(issue => issue.Advisories)
            .FirstOrDefaultAsync(i => i.ImageId == imageId && i.IssueId == issueId);
        if (image is null)
        {
            return NotFound();
        }

        if (User.IsInRole("Officer") && !_currentUser.IsAdmin(User))
        {
            // Same boundary as AdvisoriesController: the officer's own district, or a case they
            // reviewed themselves.
            var userId = _currentUser.GetUserId(User);
            var district = await _currentUser.GetOfficerDistrictAsync(User);
            var inDistrict = district is not null && image.Issue.Crop.Field.Farm.District == district;
            if (!inDistrict && !image.Issue.Advisories.Any(a => a.ReviewedByFK == userId))
            {
                return Forbid();
            }
        }
        else if (!User.IsInRole("Admin"))
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
    public async Task<ActionResult<PagedResponse<CropIssueResponse>>> Reviewed(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetUserId(User);

        var query = _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User)
            .Where(i => i.Advisories.Any(a => a.ReviewedByFK == userId));

        // OrderByDescending on the reviewed advisory's timestamp, not the issue's — sorting by
        // when it was reviewed (not when it was reported) is what makes this "recent activity"
        // rather than just Pending() with an extra filter. A correlated subquery, like Pending()'s
        // sort, so paging happens in the database.
        var ordered = query
            .OrderByDescending(i => i.Advisories
                .Where(a => a.ReviewedByFK == userId)
                .Max(a => (DateTime?)a.ReviewedAt));

        var paged = await ordered.ToPagedResponseAsync(page, pageSize, cancellationToken);
        return Ok(paged.Map(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>Every issue ever reported, any status — Admin's full oversight view, not just
    /// the Officer's Draft-advisory work queue. Optionally narrowed to one <paramref name="status"/>
    /// and a free-text <paramref name="search"/>; <paramref name="sort"/> is newest (default),
    /// oldest or severity (High first).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResponse<CropIssueResponse>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        [FromQuery, StringLength(100)] string? search = null,
        [FromQuery] IssueStatus? status = null,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        IQueryable<CropIssue> query = _db.CropIssues
            .Include(i => i.Advisories)
            .Include(i => i.Images)
            .Include(i => i.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Include(i => i.FarmerProfile).ThenInclude(fp => fp.User);

        if (status is IssueStatus wanted)
        {
            query = query.Where(i => i.Status == wanted);
        }

        var ordered = Sort(Search(query, search), sort);
        if (ordered is null)
        {
            return BadRequest(new { message = "sort must be newest, oldest or severity." });
        }

        var paged = await ordered.ToPagedResponseAsync(page, pageSize, cancellationToken);
        return Ok(paged.Map(i => ToResponse(i, includeReporter: true)));
    }

    /// <summary>Issues whose title, description, crop, variety, district or reporter contain the term.</summary>
    private static IQueryable<CropIssue> Search(IQueryable<CropIssue> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var term = search.Trim().ToLower();
        return query.Where(i => i.Title.ToLower().Contains(term)
            || i.Description.ToLower().Contains(term)
            || i.Crop.CropType.ToLower().Contains(term)
            || i.Crop.Variety.ToLower().Contains(term)
            || i.Crop.Field.Farm.District.ToLower().Contains(term)
            || i.FarmerProfile.User.FullName.ToLower().Contains(term));
    }

    /// <summary>newest (the default), oldest or severity; null for anything else.</summary>
    private static IOrderedQueryable<CropIssue>? Sort(IQueryable<CropIssue> query, string? sort) =>
        (sort ?? "newest").ToLowerInvariant() switch
        {
            "newest" => query.OrderByDescending(i => i.CreatedAt),
            "oldest" => query.OrderBy(i => i.CreatedAt),
            // Severity is stored as text, so rank it explicitly rather than alphabetically.
            "severity" => query
                .OrderByDescending(i => i.Severity == IssueSeverity.High ? 3 : i.Severity == IssueSeverity.Medium ? 2 : 1)
                .ThenBy(i => i.CreatedAt),
            _ => null,
        };

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
