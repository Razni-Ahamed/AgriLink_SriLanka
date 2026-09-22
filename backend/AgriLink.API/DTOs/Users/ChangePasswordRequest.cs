using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Users;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    // No length/complexity attributes here on purpose — Identity's own password policy
    // (Program.cs) is the single source of truth and returns its own descriptive errors.
    [Required]
    public string NewPassword { get; set; } = string.Empty;
}
