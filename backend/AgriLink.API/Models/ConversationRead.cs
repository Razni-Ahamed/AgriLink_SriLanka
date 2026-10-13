namespace AgriLink.API.Models;

/// <summary>How far one participant has read a conversation: messages after this id, from someone
/// else, are unread for them. No row means nothing has been read yet.</summary>
public class ConversationRead
{
    public int ConversationId { get; set; }
    public int UserId { get; set; }
    public int LastReadMessageId { get; set; }
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
