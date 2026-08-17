using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Issues;

public class CreateCropIssueRequest
{
    [Required]
    public int CropId { get; set; }

    [Required, MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;
}
