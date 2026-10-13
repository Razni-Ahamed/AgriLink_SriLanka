namespace AgriLink.API.Models;

/// <summary>A participant's report of a conversation. Admins can read a conversation only once it
/// has been reported, and only to deal with the report.</summary>
public class ConversationReport
{
    public const int MaxReasonLength = 500;

    public int ReportId { get; set; }
    public int ConversationId { get; set; }
    public int ReporterUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedByUserId { get; set; }
    public string? ResolutionNote { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public ApplicationUser Reporter { get; set; } = null!;
    public ApplicationUser? ResolvedBy { get; set; }
}
