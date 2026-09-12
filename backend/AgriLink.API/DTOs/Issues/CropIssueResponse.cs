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
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? AdvisoryId { get; set; }
}
