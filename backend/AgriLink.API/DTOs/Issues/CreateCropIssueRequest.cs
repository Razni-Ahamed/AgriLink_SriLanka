using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Issues;

public class CreateCropIssueRequest
{
    [Required]
    public int CropId { get; set; }

    [Required, MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;

    /// <summary>
    /// Optional id the app makes for this report, so sending it twice files it once (see
    /// CropIssue.ClientReportId).
    /// </summary>
    public Guid? ClientReportId { get; set; }
}
