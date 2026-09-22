using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Accounts;

public class CreateChangeRequestRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>"FullName", "NIC" or "Email" — matches AgriLink.API.Models.ChangeRequestField.</summary>
    [Required]
    public string Field { get; set; } = string.Empty;

    [Required]
    public string NewValue { get; set; } = string.Empty;
}
