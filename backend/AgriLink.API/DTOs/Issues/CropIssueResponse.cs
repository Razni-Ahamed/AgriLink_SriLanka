namespace AgriLink.API.DTOs.Issues;

public class CropIssueResponse
{
    public int IssueId { get; set; }
    public int CropId { get; set; }

    /// <summary>
    /// The crop this issue is about. A bare CropId told the farmer nothing on "My Issues", and
    /// told the reviewing officer nothing at all on "Pending Issues" — where knowing the crop
    /// is most of the diagnosis.
    /// </summary>
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;

    /// <summary>Reporting farmer's name — populated for the Officer/Admin-facing lists (Pending, All);
    /// left blank on the farmer's own "Mine" list, since that would just echo their own name back.</summary>
    public string ReporterName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? AdvisoryId { get; set; }

    /// <summary>When the issue's latest advisory was reviewed — null while it's still in the
    /// Draft queue. Lets "My Reviews" sort/display without a second request per row.</summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>The reviewing officer's own note on the latest advisory, if they left one.</summary>
    public string? ReviewNote { get; set; }
}
