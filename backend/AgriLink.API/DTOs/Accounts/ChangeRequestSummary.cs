namespace AgriLink.API.DTOs.Accounts;

/// <summary>One of the caller's own change requests, as shown on their own Security tab.</summary>
public class ChangeRequestSummary
{
    public int RequestId { get; set; }
    public string Field { get; set; } = string.Empty;
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public string? RejectionReason { get; set; }
}
