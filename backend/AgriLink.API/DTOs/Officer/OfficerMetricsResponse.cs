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

    /// <summary>Issues in this district waiting longer than <see cref="OverdueAfterHours"/>.</summary>
    public int OverdueInDistrict { get; set; }

    /// <summary>How long the district's longest-waiting issue has waited; null when the queue is empty.</summary>
    public double? OldestPendingHours { get; set; }

    /// <summary>This officer's average time from AI draft to decision over the last 30 days; null
    /// when they reviewed nothing in that time.</summary>
    public double? AverageReviewHours { get; set; }

    public int ReviewsInAverage { get; set; }
    public double OverdueAfterHours { get; set; }
}
