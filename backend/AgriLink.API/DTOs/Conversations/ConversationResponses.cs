using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Conversations;

/// <summary>One line of the caller's chat list.</summary>
public class ConversationSummaryResponse
{
    public int ConversationId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CropType { get; set; } = string.Empty;
    public decimal? Quantity { get; set; }
    public string District { get; set; } = string.Empty;

    /// <summary>Who the caller is talking to. Null for a farmer's advice chat, which is with "the
    /// officers of <see cref="District"/>" rather than one person.</summary>
    public string? CounterpartName { get; set; }

    /// <summary>"Farmer", "Buyer" or "Officer".</summary>
    public string CounterpartRole { get; set; } = string.Empty;
    public string? CounterpartPhotoUrl { get; set; }

    public string? LastMessagePreview { get; set; }
    public bool LastMessageIsMine { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}

/// <summary>A conversation as the chat screen shows it.</summary>
public class ConversationResponse
{
    public int ConversationId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CropType { get; set; } = string.Empty;
    public decimal? Quantity { get; set; }
    public string District { get; set; } = string.Empty;

    public string? CounterpartName { get; set; }
    public string CounterpartRole { get; set; } = string.Empty;
    public string? CounterpartBusinessName { get; set; }
    public string? CounterpartPhotoUrl { get; set; }

    /// <summary>Links back to what the chat is about.</summary>
    public int? RequestId { get; set; }
    public int? OrderId { get; set; }
    public int? HarvestId { get; set; }
    public int? IssueId { get; set; }
    public int? AdvisoryId { get; set; }

    /// <summary>A declined or withdrawn request with no order: readable, but no new messages.</summary>
    public bool IsClosed { get; set; }

    /// <summary>False for an admin reading a reported chat, and for a closed one.</summary>
    public bool CanSend { get; set; }

    public bool ReportedByMe { get; set; }

    /// <summary>The newest message the other side has read, for "Seen" under the caller's own
    /// messages; null when they haven't opened the chat.</summary>
    public int? CounterpartLastReadMessageId { get; set; }

    /// <summary>Everyone involved; filled in for an admin reviewing a report.</summary>
    public List<ConversationParticipantResponse>? Participants { get; set; }
}

public class ConversationParticipantResponse
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class ConversationMessageResponse
{
    public int MessageId { get; set; }
    public int SenderUserId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderRole { get; set; } = string.Empty;
    public string? SenderPhotoUrl { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsMine { get; set; }
}

public class ConversationMessagesResponse
{
    /// <summary>Oldest first.</summary>
    public List<ConversationMessageResponse> Items { get; set; } = new();
    public bool HasOlder { get; set; }
}

public class ConversationUnreadCountResponse
{
    public int Count { get; set; }
}

public class SendConversationMessageRequest
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(ConversationMessage.MaxBodyLength)]
    public string Body { get; set; } = string.Empty;
}

public class ReportConversationRequest
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(ConversationReport.MaxReasonLength)]
    public string Reason { get; set; } = string.Empty;
}

public class ResolveConversationReportRequest
{
    [MaxLength(ConversationReport.MaxReasonLength)]
    public string? Note { get; set; }
}

public class ConversationReportResponse
{
    public int ReportId { get; set; }
    public int ConversationId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ReporterName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedByName { get; set; }
    public string? ResolutionNote { get; set; }
}

public class ConversationReportCountResponse
{
    public int Open { get; set; }
}
