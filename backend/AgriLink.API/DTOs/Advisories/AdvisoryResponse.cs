namespace AgriLink.API.DTOs.Advisories;

public class AdvisoryResponse
{
    public int AdvisoryId { get; set; }
    public int IssueId { get; set; }
    public string IssueTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public float ConfidenceScore { get; set; }
    public bool RequiresApproval { get; set; }
    public int? ReviewedByFK { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
