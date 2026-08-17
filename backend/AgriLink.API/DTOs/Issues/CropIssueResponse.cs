namespace AgriLink.API.DTOs.Issues;

public class CropIssueResponse
{
    public int IssueId { get; set; }
    public int CropId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
