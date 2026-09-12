namespace AgriLink.API.DTOs.Issues;

/// <summary>
/// A prior issue on the same crop, for the reviewer looking at a new one — "has this crop had
/// this problem before?" is core triage context that no endpoint gave an Officer/Admin any way
/// to see; they only ever saw the one issue in front of them.
/// </summary>
public class PreviousIssueSummary
{
    public int IssueId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? AdvisoryId { get; set; }
}
