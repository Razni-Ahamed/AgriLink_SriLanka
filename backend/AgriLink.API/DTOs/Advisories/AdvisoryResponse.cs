using AgriLink.API.DTOs.Issues;

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
    public string? ReviewNote { get; set; }

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

    /// <summary>Other issues on the same crop; populated only for an Officer/Admin caller (see
    /// AdvisoriesController.GetById) — a farmer viewing their own advisory doesn't need it,
    /// since MyIssuesPage already shows them their own full history.</summary>
    public List<PreviousIssueSummary>? PreviousIssues { get; set; }

    /// <summary>The AI pipeline run that produced this advisory; populated only for an
    /// Officer/Admin caller. Null for a Farmer's own view, and also null if the pipeline
    /// somehow ran with no recorded workflow (should not happen, but the field stays optional
    /// rather than the endpoint erroring on it).</summary>
    public AgentTraceResponse? AgentTrace { get; set; }

    /// <summary>What the photo model identified; null when the issue had no photo diagnosis.</summary>
    public PhotoDiagnosisResponse? PhotoDiagnosis { get; set; }

    /// <summary>The disease the officer confirmed or corrected to, once reviewed.</summary>
    public string? ConfirmedDiseaseKey { get; set; }
    public string? ConfirmedDiseaseName { get; set; }

    /// <summary>Treatment the officer gave; when present it replaces the AI-drafted advice.</summary>
    public string? OfficerTreatment { get; set; }

    /// <summary>Photos the farmer attached. Each Url is an authenticated API path, not a public link.</summary>
    public List<IssuePhotoResponse> Photos { get; set; } = new();
}

public class PhotoDiagnosisResponse
{
    public string DiseaseKey { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;

    // Reviewer-only below: null for a farmer's own view.

    /// <summary>The model's calibrated probability for the predicted disease.</summary>
    public float? ModelConfidence { get; set; }
    public string? ModelVersion { get; set; }

    /// <summary>EscalationReason codes: why this diagnosis was held for the officer.</summary>
    public List<string>? EscalationReasons { get; set; }

    /// <summary>What the officer may correct the diagnosis to: the crop's classes, then "other".</summary>
    public List<DiseaseOptionResponse>? DiseaseOptions { get; set; }
}

public class DiseaseOptionResponse
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class IssuePhotoResponse
{
    public int ImageId { get; set; }
    public string Url { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
}
