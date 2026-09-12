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
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }

    // Full issue context — an officer/admin reviewing this needs to see what was reported and
    // by whom, not just the AI's recommendation, and a bare id here told them neither.
    public string IssueDescription { get; set; } = string.Empty;
    public string IssueSeverity { get; set; } = string.Empty;
    public string IssueStatus { get; set; } = string.Empty;
    public DateTime IssueCreatedAt { get; set; }
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string ReporterName { get; set; } = string.Empty;
}
