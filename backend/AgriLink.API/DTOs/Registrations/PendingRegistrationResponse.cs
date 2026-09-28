namespace AgriLink.API.DTOs.Registrations;

public class PendingRegistrationResponse
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? NIC { get; set; }
    public DateTime CreatedAt { get; set; }

    // Farmer-only
    public string? FieldPlotNumber { get; set; }
    public string? PhoneNumber { get; set; }

    // Buyer-only
    public string? BusinessRegistrationNumber { get; set; }
    public string? BusinessPhone { get; set; }
    public string? LegalBusinessName { get; set; }

    // Rejected applications only (GET /api/registrations/rejected).
    public string? RejectionReason { get; set; }

    /// <summary>When it was rejected, from the audit log; null if no audit entry exists.</summary>
    public DateTime? RejectedAt { get; set; }
}
