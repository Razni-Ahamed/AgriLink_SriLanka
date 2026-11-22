namespace AgriLink.API.Models;

public class CropIssue : IHasUpdatedAt
{
    public int IssueId { get; set; }
    public int CropId { get; set; }
    public int FarmerProfileId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;
    public IssueStatus Status { get; set; } = IssueStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// An id the farmer's app gives the report when it is made. A report sent again (the signal
    /// dropped before the answer arrived, so the app kept it to retry) carries the same id, and the
    /// API returns the issue it already created instead of filing a second one. Null for clients
    /// that don't send one.
    /// </summary>
    public Guid? ClientReportId { get; set; }

    public Crop Crop { get; set; } = null!;
    public FarmerProfile FarmerProfile { get; set; } = null!;
    public ICollection<AIAdvisory> Advisories { get; set; } = new List<AIAdvisory>();
    public ICollection<IssueImage> Images { get; set; } = new List<IssueImage>();
}
