using AgriLink.API.Common;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Conversations;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Chat about a purchase request (farmer and buyer) or a crop issue (farmer and the district's
/// officers). Who may take part is decided by <see cref="ConversationSubject"/>; admins can only
/// read a conversation after a participant reports it. The website polls for new messages — the
/// free App Service plan allows only a handful of live connections.
/// </summary>
[ApiController]
[Route("api/conversations")]
[Authorize]
public class ConversationsController : ControllerBase
{
    public const int MessagesPerMinute = 10;
    public const int MessagePageSize = 50;
    private const int PreviewLength = 120;
    private const int NotificationPreviewLength = 80;

    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IAuditLogService _auditLog;

    public ConversationsController(
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IAuditLogService auditLog)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
        _auditLog = auditLog;
    }

    private sealed record ChatAccess(Conversation Conversation, ConversationSubject Subject, ChatCaller Caller, bool AsAdmin);

    private async Task<ChatCaller> CallerAsync()
    {
        var isOfficer = User.IsInRole("Officer");
        return new ChatCaller(
            _currentUser.GetUserId(User),
            isOfficer,
            _currentUser.IsAdmin(User),
            isOfficer ? await _currentUser.GetOfficerDistrictAsync(User) : null);
    }

    /// <summary>The conversation, if the caller takes part in it — or is an admin and it has been reported.</summary>
    private async Task<(ChatAccess? Access, ActionResult? Error)> OpenAsync(int conversationId, CancellationToken cancellationToken)
    {
        var caller = await CallerAsync();
        var conversation = await _db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ConversationId == conversationId, cancellationToken);
        var subject = conversation is null
            ? null
            : await ConversationSubject.ForConversationAsync(_db, conversation, cancellationToken);
        if (conversation is null || subject is null)
        {
            return (null, NotFound(new { message = "Conversation not found." }));
        }

        if (subject.IsParticipant(caller))
        {
            return (new ChatAccess(conversation, subject, caller, AsAdmin: false), null);
        }

        if (caller.IsAdmin && await _db.ConversationReports.AnyAsync(r => r.ConversationId == conversationId, cancellationToken))
        {
            return (new ChatAccess(conversation, subject, caller, AsAdmin: true), null);
        }

        return (null, Forbid());
    }

    /// <summary>Every conversation the caller takes part in — the same rule as
    /// <see cref="ConversationSubject.IsParticipant"/>, written as a query.</summary>
    private IQueryable<Conversation> Mine(ChatCaller caller)
    {
        var userId = caller.UserId;
        var isOfficer = caller.IsOfficer;
        var district = caller.OfficerDistrict;
        return _db.Conversations.Where(c =>
            (c.Kind == ConversationKind.Deal
                && (c.Request!.Harvest.FarmerProfile.UserId == userId || c.Request.BuyerProfile.UserId == userId))
            || (c.Kind == ConversationKind.Advice
                && (c.Issue!.FarmerProfile.UserId == userId
                    || (isOfficer
                        && ((district != null && c.Issue.Crop.Field.Farm.District == district)
                            || c.Issue.Advisories.Any(a => a.ReviewedByFK == userId))))));
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ConversationSummaryResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PagingExtensions.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var caller = await CallerAsync();
        var userId = caller.UserId;

        var paged = await Mine(caller)
            .Where(c => c.LastMessageAt != null)
            .OrderByDescending(c => c.LastMessageAt).ThenByDescending(c => c.ConversationId)
            .Select(c => new
            {
                c.ConversationId,
                c.Kind,
                c.LastMessageAt,
                DealCrop = c.Request != null ? c.Request.Harvest.Crop.CropType : null,
                DealQuantity = c.Request != null ? (decimal?)c.Request.RequestedQuantity : null,
                DealDistrict = c.Request != null ? c.Request.Harvest.Crop.Field.Farm.District : null,
                DealFarmerUserId = c.Request != null ? (int?)c.Request.Harvest.FarmerProfile.UserId : null,
                DealFarmerName = c.Request != null ? c.Request.Harvest.FarmerProfile.User.FullName : null,
                DealFarmerPhoto = c.Request != null ? c.Request.Harvest.FarmerProfile.User.ProfilePhotoUrl : null,
                DealBuyerName = c.Request != null ? c.Request.BuyerProfile.User.FullName : null,
                DealBuyerPhoto = c.Request != null ? c.Request.BuyerProfile.User.ProfilePhotoUrl : null,
                IssueTitle = c.Issue != null ? c.Issue.Title : null,
                IssueCrop = c.Issue != null ? c.Issue.Crop.CropType : null,
                IssueDistrict = c.Issue != null ? c.Issue.Crop.Field.Farm.District : null,
                IssueFarmerUserId = c.Issue != null ? (int?)c.Issue.FarmerProfile.UserId : null,
                IssueFarmerName = c.Issue != null ? c.Issue.FarmerProfile.User.FullName : null,
                IssueFarmerPhoto = c.Issue != null ? c.Issue.FarmerProfile.User.ProfilePhotoUrl : null,
                Last = c.Messages
                    .OrderByDescending(m => m.MessageId)
                    .Select(m => new { m.Body, m.SenderUserId })
                    .FirstOrDefault(),
                Unread = c.Messages.Count(m =>
                    m.SenderUserId != userId
                    && m.MessageId > c.Reads.Where(r => r.UserId == userId).Select(r => r.LastReadMessageId).FirstOrDefault()),
            })
            .ToPagedResponseAsync(page, pageSize, cancellationToken);

        return Ok(paged.Map(c =>
        {
            var isDeal = c.Kind == ConversationKind.Deal;
            var callerIsFarmer = (isDeal ? c.DealFarmerUserId : c.IssueFarmerUserId) == userId;
            var summary = new ConversationSummaryResponse
            {
                ConversationId = c.ConversationId,
                Kind = c.Kind.ToString(),
                Title = (isDeal ? c.DealCrop : c.IssueTitle) ?? string.Empty,
                CropType = (isDeal ? c.DealCrop : c.IssueCrop) ?? string.Empty,
                Quantity = c.DealQuantity,
                District = (isDeal ? c.DealDistrict : c.IssueDistrict) ?? string.Empty,
                LastMessagePreview = c.Last is null ? null : Preview(c.Last.Body, PreviewLength),
                LastMessageIsMine = c.Last?.SenderUserId == userId,
                LastMessageAt = c.LastMessageAt,
                UnreadCount = c.Unread,
            };

            if (isDeal)
            {
                summary.CounterpartRole = callerIsFarmer ? "Buyer" : "Farmer";
                summary.CounterpartName = callerIsFarmer ? c.DealBuyerName : c.DealFarmerName;
                summary.CounterpartPhotoUrl = callerIsFarmer ? c.DealBuyerPhoto : c.DealFarmerPhoto;
            }
            else
            {
                // A farmer talks to the district's officers as a group; an officer to the farmer.
                summary.CounterpartRole = callerIsFarmer ? "Officer" : "Farmer";
                summary.CounterpartName = callerIsFarmer ? null : c.IssueFarmerName;
                summary.CounterpartPhotoUrl = callerIsFarmer ? null : c.IssueFarmerPhoto;
            }

            return summary;
        }));
    }

    /// <summary>Unread messages across all the caller's conversations, for the header badge.</summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<ConversationUnreadCountResponse>> UnreadCount(CancellationToken cancellationToken)
    {
        var caller = await CallerAsync();
        var userId = caller.UserId;
        var count = await Mine(caller).SumAsync(c => c.Messages.Count(m =>
            m.SenderUserId != userId
            && m.MessageId > c.Reads.Where(r => r.UserId == userId).Select(r => r.LastReadMessageId).FirstOrDefault()),
            cancellationToken);
        return Ok(new ConversationUnreadCountResponse { Count = count });
    }

    /// <summary>Opens the chat about a purchase request, creating it on first use. Only that
    /// request's farmer and buyer can.</summary>
    [HttpPost("deal/{requestId:int}")]
    public async Task<ActionResult<ConversationResponse>> StartDeal(int requestId, CancellationToken cancellationToken)
    {
        var subject = await ConversationSubject.ForRequestAsync(_db, requestId, cancellationToken);
        return await StartAsync(subject, c => c.RequestId == requestId,
            () => new Conversation { Kind = ConversationKind.Deal, RequestId = requestId }, cancellationToken);
    }

    /// <summary>Opens the chat about a crop issue, creating it on first use. The reporting farmer
    /// and the officers who may review the issue can.</summary>
    [HttpPost("advice/{issueId:int}")]
    public async Task<ActionResult<ConversationResponse>> StartAdvice(int issueId, CancellationToken cancellationToken)
    {
        var subject = await ConversationSubject.ForIssueAsync(_db, issueId, cancellationToken);
        return await StartAsync(subject, c => c.IssueId == issueId,
            () => new Conversation { Kind = ConversationKind.Advice, IssueId = issueId }, cancellationToken);
    }

    private async Task<ActionResult<ConversationResponse>> StartAsync(
        ConversationSubject? subject,
        System.Linq.Expressions.Expression<Func<Conversation, bool>> sameSubject,
        Func<Conversation> create,
        CancellationToken cancellationToken)
    {
        if (subject is null)
        {
            return NotFound(new { message = "There is nothing to chat about here." });
        }

        var caller = await CallerAsync();
        if (!subject.IsParticipant(caller))
        {
            return Forbid();
        }

        var existing = await _db.Conversations.AsNoTracking().FirstOrDefaultAsync(sameSubject, cancellationToken);
        if (existing is not null)
        {
            return Ok(await ToResponseAsync(new ChatAccess(existing, subject, caller, AsAdmin: false), cancellationToken));
        }

        if (subject.IsClosed)
        {
            return BadRequest(new { message = "This request was declined or withdrawn, so a chat can't be started about it." });
        }

        var conversation = create();
        _db.Conversations.Add(conversation);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (UsernameErrors.IsUniqueViolation(ex))
        {
            // The other side opened it at the same moment: use theirs.
            _db.Entry(conversation).State = EntityState.Detached;
            conversation = await _db.Conversations.AsNoTracking().FirstAsync(sameSubject, cancellationToken);
            return Ok(await ToResponseAsync(new ChatAccess(conversation, subject, caller, AsAdmin: false), cancellationToken));
        }

        return StatusCode(StatusCodes.Status201Created,
            await ToResponseAsync(new ChatAccess(conversation, subject, caller, AsAdmin: false), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConversationResponse>> Get(int id, CancellationToken cancellationToken)
    {
        var (access, error) = await OpenAsync(id, cancellationToken);
        return access is null ? error! : Ok(await ToResponseAsync(access, cancellationToken));
    }

    /// <summary>The newest <see cref="MessagePageSize"/> messages, or the ones before
    /// <paramref name="beforeId"/>; oldest first.</summary>
    [HttpGet("{id:int}/messages")]
    public async Task<ActionResult<ConversationMessagesResponse>> Messages(
        int id, [FromQuery] int? beforeId, CancellationToken cancellationToken)
    {
        var (access, error) = await OpenAsync(id, cancellationToken);
        if (access is null)
        {
            return error!;
        }

        var newestFirst = await _db.ConversationMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == id && (beforeId == null || m.MessageId < beforeId))
            .OrderByDescending(m => m.MessageId)
            .Take(MessagePageSize + 1)
            .Select(m => new { m.MessageId, m.SenderUserId, SenderName = m.Sender.FullName, SenderPhotoUrl = m.Sender.ProfilePhotoUrl, m.Body, m.CreatedAt })
            .ToListAsync(cancellationToken);

        return Ok(new ConversationMessagesResponse
        {
            HasOlder = newestFirst.Count > MessagePageSize,
            Items = newestFirst
                .Take(MessagePageSize)
                .Reverse()
                .Select(m => new ConversationMessageResponse
                {
                    MessageId = m.MessageId,
                    SenderUserId = m.SenderUserId,
                    SenderName = m.SenderName,
                    SenderRole = access.Subject.RoleOf(m.SenderUserId),
                    SenderPhotoUrl = m.SenderPhotoUrl,
                    Body = m.Body,
                    CreatedAt = m.CreatedAt,
                    IsMine = m.SenderUserId == access.Caller.UserId,
                })
                .ToList(),
        });
    }

    [HttpPost("{id:int}/messages")]
    public async Task<ActionResult<ConversationMessageResponse>> Send(
        int id, SendConversationMessageRequest request, CancellationToken cancellationToken)
    {
        var (access, error) = await OpenAsync(id, cancellationToken);
        if (access is null)
        {
            return error!;
        }

        if (access.AsAdmin)
        {
            return Forbid();
        }

        if (access.Subject.IsClosed)
        {
            return BadRequest(new { message = "This request was declined or withdrawn, so this chat is closed." });
        }

        var body = request.Body.Trim();
        if (body.Length == 0)
        {
            return BadRequest(new { message = "Write a message first." });
        }

        var userId = access.Caller.UserId;
        var aMinuteAgo = DateTime.UtcNow.AddMinutes(-1);
        if (await _db.ConversationMessages.CountAsync(m => m.SenderUserId == userId && m.CreatedAt >= aMinuteAgo, cancellationToken) >= MessagesPerMinute)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { message = "You're sending messages too quickly. Wait a minute and try again." });
        }

        var sender = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.FullName, u.ProfilePhotoUrl })
            .FirstAsync(cancellationToken);

        // Each recipient hears about the first unread message only, not every line of a conversation.
        var recipients = await access.Subject.RecipientsAsync(_db, userId, cancellationToken);
        foreach (var recipientId in recipients)
        {
            var lastRead = await _db.ConversationReads
                .Where(r => r.ConversationId == id && r.UserId == recipientId)
                .Select(r => r.LastReadMessageId)
                .FirstOrDefaultAsync(cancellationToken);
            var alreadyHasUnread = await _db.ConversationMessages
                .AnyAsync(m => m.ConversationId == id && m.SenderUserId != recipientId && m.MessageId > lastRead, cancellationToken);
            if (!alreadyHasUnread)
            {
                _notifications.Add(recipientId, Truncate($"New message from {sender.FullName}", 150), NotificationText(access.Subject, body));
            }
        }

        var message = new ConversationMessage { ConversationId = id, SenderUserId = userId, Body = body };
        _db.ConversationMessages.Add(message);
        var conversation = await _db.Conversations.FirstAsync(c => c.ConversationId == id, cancellationToken);
        conversation.LastMessageAt = message.CreatedAt;
        await _db.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new ConversationMessageResponse
        {
            MessageId = message.MessageId,
            SenderUserId = userId,
            SenderName = sender.FullName,
            SenderRole = access.Subject.RoleOf(userId),
            SenderPhotoUrl = sender.ProfilePhotoUrl,
            Body = message.Body,
            CreatedAt = message.CreatedAt,
            IsMine = true,
        });
    }

    /// <summary>Marks everything in the conversation as read by the caller.</summary>
    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken cancellationToken)
    {
        var (access, error) = await OpenAsync(id, cancellationToken);
        if (access is null)
        {
            return error!;
        }

        if (access.AsAdmin)
        {
            return NoContent(); // an admin reviewing a report doesn't change anyone's unread count
        }

        var latest = await _db.ConversationMessages
            .Where(m => m.ConversationId == id)
            .MaxAsync(m => (int?)m.MessageId, cancellationToken);
        if (latest is null)
        {
            return NoContent();
        }

        var userId = access.Caller.UserId;
        for (var attempt = 0; ; attempt++)
        {
            var read = await _db.ConversationReads.FirstOrDefaultAsync(r => r.ConversationId == id && r.UserId == userId, cancellationToken);
            if (read is null)
            {
                read = new ConversationRead { ConversationId = id, UserId = userId };
                _db.ConversationReads.Add(read);
            }

            read.LastReadMessageId = Math.Max(read.LastReadMessageId, latest.Value);
            read.ReadAt = DateTime.UtcNow;
            try
            {
                await _db.SaveChangesAsync(cancellationToken);
                return NoContent();
            }
            catch (DbUpdateException ex) when (attempt == 0 && UsernameErrors.IsUniqueViolation(ex))
            {
                // Two tabs marked it read at once and the other created the row: update that one.
                _db.Entry(read).State = EntityState.Detached;
            }
        }
    }

    /// <summary>A participant reports the conversation; admins are told and can then read it.</summary>
    [HttpPost("{id:int}/report")]
    public async Task<IActionResult> Report(int id, ReportConversationRequest request, CancellationToken cancellationToken)
    {
        var (access, error) = await OpenAsync(id, cancellationToken);
        if (access is null)
        {
            return error!;
        }

        if (access.AsAdmin)
        {
            return Forbid();
        }

        var reason = request.Reason.Trim();
        if (reason.Length == 0)
        {
            return BadRequest(new { message = "Say briefly what is wrong." });
        }

        var userId = access.Caller.UserId;
        if (await _db.ConversationReports.AnyAsync(r => r.ConversationId == id && r.ReporterUserId == userId && r.ResolvedAt == null, cancellationToken))
        {
            return Conflict(new { message = "You have already reported this conversation. An administrator will look at it." });
        }

        var report = new ConversationReport { ConversationId = id, ReporterUserId = userId, Reason = reason };
        _db.ConversationReports.Add(report);
        _auditLog.Record(userId, "ConversationReported", "Conversation", id, newValue: reason);

        var adminIds = await (
            from userRole in _db.UserRoles
            join role in _db.Roles on userRole.RoleId equals role.Id
            where role.Name == "Admin"
            select userRole.UserId).ToListAsync(cancellationToken);
        foreach (var adminId in adminIds)
        {
            _notifications.Add(adminId, "A conversation was reported",
                $"A {access.Subject.Kind.ToString().ToLowerInvariant()} chat about \"{Truncate(access.Subject.Title, 60)}\" was reported: {Truncate(reason, 120)}");
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (UsernameErrors.IsUniqueViolation(ex))
        {
            return Conflict(new { message = "You have already reported this conversation. An administrator will look at it." });
        }

        return NoContent();
    }

    private async Task<ConversationResponse> ToResponseAsync(ChatAccess access, CancellationToken cancellationToken)
    {
        var (conversation, subject, caller, asAdmin) = access;
        var reads = await _db.ConversationReads.AsNoTracking()
            .Where(r => r.ConversationId == conversation.ConversationId)
            .Select(r => new { r.UserId, r.LastReadMessageId })
            .ToListAsync(cancellationToken);
        var callerIsFarmer = caller.UserId == subject.FarmerUserId;

        var response = new ConversationResponse
        {
            ConversationId = conversation.ConversationId,
            Kind = subject.Kind.ToString(),
            Title = subject.Title,
            CropType = subject.CropType,
            Quantity = subject.Quantity,
            District = subject.District,
            RequestId = subject.RequestId,
            OrderId = subject.OrderId,
            HarvestId = subject.HarvestId,
            IssueId = subject.IssueId,
            AdvisoryId = subject.AdvisoryId,
            IsClosed = subject.IsClosed,
            CanSend = !asAdmin && !subject.IsClosed,
            ReportedByMe = !asAdmin && await _db.ConversationReports.AnyAsync(
                r => r.ConversationId == conversation.ConversationId && r.ReporterUserId == caller.UserId && r.ResolvedAt == null,
                cancellationToken),
        };

        if (asAdmin)
        {
            response.Participants = new List<ConversationParticipantResponse>
            {
                new() { Name = subject.FarmerName, Role = "Farmer" },
                subject.Kind == ConversationKind.Deal
                    ? new() { Name = subject.BuyerName ?? string.Empty, Role = "Buyer" }
                    : new() { Name = subject.District, Role = "Officer" },
            };
            return response;
        }

        if (subject.Kind == ConversationKind.Deal)
        {
            response.CounterpartRole = callerIsFarmer ? "Buyer" : "Farmer";
            response.CounterpartName = callerIsFarmer ? subject.BuyerName : subject.FarmerName;
            response.CounterpartBusinessName = callerIsFarmer ? subject.BuyerBusinessName : null;
            response.CounterpartPhotoUrl = callerIsFarmer ? subject.BuyerPhotoUrl : subject.FarmerPhotoUrl;
            var counterpartId = callerIsFarmer ? subject.BuyerUserId : subject.FarmerUserId;
            response.CounterpartLastReadMessageId = reads.FirstOrDefault(r => r.UserId == counterpartId)?.LastReadMessageId;
        }
        else
        {
            response.CounterpartRole = callerIsFarmer ? "Officer" : "Farmer";
            response.CounterpartName = callerIsFarmer ? null : subject.FarmerName;
            response.CounterpartPhotoUrl = callerIsFarmer ? null : subject.FarmerPhotoUrl;
            var counterpartReads = reads.Where(r => callerIsFarmer ? r.UserId != subject.FarmerUserId : r.UserId == subject.FarmerUserId);
            response.CounterpartLastReadMessageId = counterpartReads.Select(r => (int?)r.LastReadMessageId).Max();
        }

        return response;
    }

    private static string NotificationText(ConversationSubject subject, string body) =>
        (subject.Kind == ConversationKind.Deal
            ? $"About the {subject.CropType} purchase request: "
            : $"About \"{Truncate(subject.Title, 60)}\": ")
        + $"\"{Preview(body, NotificationPreviewLength)}\"";

    private static string Preview(string text, int max)
    {
        var oneLine = string.Join(' ', text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));
        return oneLine.Length <= max ? oneLine : oneLine[..(max - 1)].TrimEnd() + "…";
    }

    private static string Truncate(string text, int max) => text.Length <= max ? text : text[..(max - 1)] + "…";
}
