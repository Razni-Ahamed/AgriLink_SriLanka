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

    /// <summary>
    /// The reviewing officer's own note, added when approving or rejecting — e.g. why a
    /// recommendation was rejected, or extension advice beyond what the AI drafted. Optional:
    /// a reviewer can still approve/reject with no note, same as before this existed.
    /// </summary>
    public string? ReviewNote { get; set; }

    /// <summary>Class key the photo model predicted (ml/labels/&lt;crop&gt;.json); null when the issue had
    /// no photo, or its photo was not classified.</summary>
    public string? PredictedDiseaseKey { get; set; }

    /// <summary>The model's calibrated probability for <see cref="PredictedDiseaseKey"/>.</summary>
    public float? ModelConfidence { get; set; }

    /// <summary>modelVersion from the model.json that produced the prediction.</summary>
    public string? ModelVersion { get; set; }

    /// <summary>Comma-separated <c>EscalationReason</c> codes for why the photo diagnosis needs an
    /// officer; null when the advice was released without one, or there was no photo diagnosis.</summary>
    public string? EscalationReasons { get; set; }

    public CropIssue Issue { get; set; } = null!;
    public ApplicationUser? ReviewedByUser { get; set; }
    public ICollection<AgentWorkflow> Workflows { get; set; } = new List<AgentWorkflow>();
}
