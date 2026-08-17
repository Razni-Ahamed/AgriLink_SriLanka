namespace AgriLink.API.Models;

public class CropIssue
{
    public int IssueId { get; set; }
    public int CropId { get; set; }
    public int FarmerProfileId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;
    public IssueStatus Status { get; set; } = IssueStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Crop Crop { get; set; } = null!;
    public FarmerProfile FarmerProfile { get; set; } = null!;
    public ICollection<AIAdvisory> Advisories { get; set; } = new List<AIAdvisory>();
}
