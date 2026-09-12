namespace AgriLink.API.DTOs.Officer;

/// <summary>At-a-glance counts for the Officer's own dashboard — the same numbers Admin already
/// has for the whole platform, scoped to this one officer's district and their own review
/// history, since nothing like this existed for Officer before.</summary>
public class OfficerMetricsResponse
{
    public string District { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;

    /// <summary>Draft-advisory issues in this officer's own district — what GET
    /// /api/issues/pending returns them, so this always matches that queue's length.</summary>
    public int PendingInDistrict { get; set; }

    public int ReviewedToday { get; set; }
    public int ReviewedTotal { get; set; }
    public int ApprovedTotal { get; set; }
    public int RejectedTotal { get; set; }
}
