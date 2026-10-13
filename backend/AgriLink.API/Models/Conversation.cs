namespace AgriLink.API.Models;

/// <summary>
/// A chat about one thing that already exists — a purchase request or a crop issue — never an open
/// line between any two users, so nobody can message a stranger. Who takes part follows from that
/// subject (see Services/Chat/ConversationAccess).
/// </summary>
public class Conversation
{
    public int ConversationId { get; set; }
    public ConversationKind Kind { get; set; }

    /// <summary>Set for a <see cref="ConversationKind.Deal"/> chat, and only then.</summary>
    public int? RequestId { get; set; }

    /// <summary>Set for an <see cref="ConversationKind.Advice"/> chat, and only then.</summary>
    public int? IssueId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Null until the first message; lists show only chats that have one.</summary>
    public DateTime? LastMessageAt { get; set; }

    public PurchaseRequest? Request { get; set; }
    public CropIssue? Issue { get; set; }
    public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
    public ICollection<ConversationRead> Reads { get; set; } = new List<ConversationRead>();
    public ICollection<ConversationReport> Reports { get; set; } = new List<ConversationReport>();
}
