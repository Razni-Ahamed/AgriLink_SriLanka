namespace AgriLink.API.Models;

public class AIAdvisory
{
    public int AdvisoryId { get; set; }
    public int IssueId { get; set; }
    public AdvisoryStatus Status { get; set; } = AdvisoryStatus.Draft;
    public RiskLevel RiskLevel { get; set; } = RiskLevel.Low;
    public string Recommendation { get; set; } = string.Empty;
    public float ConfidenceScore { get; set; }
    public bool RequiresApproval { get; set; } = true;
    public int? ReviewedByFK { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public CropIssue Issue { get; set; } = null!;
    public ApplicationUser? ReviewedByUser { get; set; }
    public ICollection<AgentWorkflow> Workflows { get; set; } = new List<AgentWorkflow>();
}
