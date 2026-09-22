namespace AgriLink.API.Models;

/// <summary>The identity fields a change request can cover — never password (that's a direct,
/// re-authenticated change) and never anything Part A's General tab owns.</summary>
public enum ChangeRequestField
{
    FullName,
    NIC,
    Email,
}

public enum ChangeRequestStatus
{
    Pending,
    Approved,
    Rejected,
    /// <summary>The requester cancelled it themselves before anyone decided it.</summary>
    Withdrawn,
}

/// <summary>
/// A pending identity-detail change (full name, NIC, email) awaiting an Officer's or Admin's
/// decision. The old value stays in effect until <see cref="Status"/> becomes Approved — nothing
/// reads <see cref="NewValue"/> as current until then.
/// </summary>
public class ProfileChangeRequest
{
    public int RequestId { get; set; }
    public int UserId { get; set; }
    public ChangeRequestField Field { get; set; }
    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;
    public ChangeRequestStatus Status { get; set; } = ChangeRequestStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public int? DecidedByUserId { get; set; }
    public DateTime? DecidedAt { get; set; }
    public string? RejectionReason { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public ApplicationUser? DecidedByUser { get; set; }
}
