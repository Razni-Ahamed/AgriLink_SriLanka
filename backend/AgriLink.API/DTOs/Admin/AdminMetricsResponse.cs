namespace AgriLink.API.DTOs.Admin;

public class AdminMetricsResponse
{
    public int TotalUsers { get; set; }
    public int TotalFarms { get; set; }
    public int TotalCrops { get; set; }
    public int IssuesReported { get; set; }
    public int IssuesPending { get; set; }
    public int IssuesResolved { get; set; }
    public decimal HarvestVolumeSoldThisMonth { get; set; }

    /// <summary>Issues, in any district, waiting longer than <see cref="OverdueAfterHours"/>.</summary>
    public int IssuesOverdue { get; set; }

    /// <summary>How long the longest-waiting issue has waited; null when nothing is waiting.</summary>
    public double? OldestPendingHours { get; set; }

    /// <summary>Average time from AI draft to an officer's decision over the last 30 days; null when
    /// nothing was reviewed in that time.</summary>
    public double? AverageReviewHours { get; set; }

    public int ReviewsInAverage { get; set; }
    public double OverdueAfterHours { get; set; }
}
