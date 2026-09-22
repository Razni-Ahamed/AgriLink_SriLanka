namespace AgriLink.API.DTOs.Accounts;

/// <summary>One row of an Officer's or Admin's approval queue (GET /api/profile-change-requests/pending).</summary>
public class PendingChangeRequestResponse
{
    public int RequestId { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string? District { get; set; }
    public string Field { get; set; } = string.Empty;
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
}
