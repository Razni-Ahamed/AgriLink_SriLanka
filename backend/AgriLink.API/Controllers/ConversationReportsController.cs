using AgriLink.API.Common;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Conversations;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Reported conversations, for admins. A reported conversation can then be read through
/// GET /api/conversations/{id} and its messages; an admin can't post in it.
/// </summary>
[ApiController]
[Route("api/admin/conversation-reports")]
[Authorize(Roles = "Admin")]
public class ConversationReportsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ConversationReportsController(AgriLinkDbContext db, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    /// <summary>Open reports first (oldest first, so nothing waits forever), then resolved ones.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResponse<ConversationReportResponse>>> List(
        [FromQuery] bool openOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var reports = _db.ConversationReports.AsNoTracking();
        if (openOnly)
        {
            reports = reports.Where(r => r.ResolvedAt == null);
        }

        var paged = await reports
            .OrderBy(r => r.ResolvedAt != null)
            .ThenByDescending(r => r.ResolvedAt)
            .ThenBy(r => r.CreatedAt)
            .Select(r => new ConversationReportResponse
            {
                ReportId = r.ReportId,
                ConversationId = r.ConversationId,
                Kind = r.Conversation.Kind.ToString(),
                Title = r.Conversation.Kind == ConversationKind.Deal
                    ? r.Conversation.Request!.Harvest.Crop.CropType
                    : r.Conversation.Issue!.Title,
                ReporterName = r.Reporter.FullName,
                Reason = r.Reason,
                CreatedAt = r.CreatedAt,
                ResolvedAt = r.ResolvedAt,
                ResolvedByName = r.ResolvedBy != null ? r.ResolvedBy.FullName : null,
                ResolutionNote = r.ResolutionNote,
            })
            .ToPagedResponseAsync(page, pageSize, cancellationToken);

        return Ok(paged);
    }

    /// <summary>Backs the admin's header badge.</summary>
    [HttpGet("open-count")]
    public async Task<ActionResult<ConversationReportCountResponse>> OpenCount(CancellationToken cancellationToken) =>
        Ok(new ConversationReportCountResponse
        {
            Open = await _db.ConversationReports.CountAsync(r => r.ResolvedAt == null, cancellationToken),
        });

    [HttpPut("{reportId:int}/resolve")]
    public async Task<ActionResult<ConversationReportResponse>> Resolve(
        int reportId, ResolveConversationReportRequest? request, CancellationToken cancellationToken)
    {
        var report = await _db.ConversationReports
            .Include(r => r.Reporter)
            .Include(r => r.Conversation).ThenInclude(c => c.Request!).ThenInclude(r => r.Harvest).ThenInclude(h => h.Crop)
            .Include(r => r.Conversation).ThenInclude(c => c.Issue)
            .FirstOrDefaultAsync(r => r.ReportId == reportId, cancellationToken);
        if (report is null)
        {
            return NotFound(new { message = "Report not found." });
        }

        if (report.ResolvedAt is not null)
        {
            return BadRequest(new { message = "This report has already been resolved." });
        }

        var adminId = _currentUser.GetUserId(User);
        var note = string.IsNullOrWhiteSpace(request?.Note) ? null : request.Note.Trim();
        report.ResolvedAt = DateTime.UtcNow;
        report.ResolvedByUserId = adminId;
        report.ResolutionNote = note;
        _auditLog.Record(adminId, "ConversationReportResolved", "Conversation", report.ConversationId, report.Reason, note);
        await _db.SaveChangesAsync(cancellationToken);

        var adminName = await _db.Users.Where(u => u.Id == adminId).Select(u => u.FullName).FirstOrDefaultAsync(cancellationToken);
        return Ok(new ConversationReportResponse
        {
            ReportId = report.ReportId,
            ConversationId = report.ConversationId,
            Kind = report.Conversation.Kind.ToString(),
            Title = report.Conversation.Kind == ConversationKind.Deal
                ? report.Conversation.Request?.Harvest.Crop.CropType ?? string.Empty
                : report.Conversation.Issue?.Title ?? string.Empty,
            ReporterName = report.Reporter.FullName,
            Reason = report.Reason,
            CreatedAt = report.CreatedAt,
            ResolvedAt = report.ResolvedAt,
            ResolvedByName = adminName,
            ResolutionNote = report.ResolutionNote,
        });
    }
}
