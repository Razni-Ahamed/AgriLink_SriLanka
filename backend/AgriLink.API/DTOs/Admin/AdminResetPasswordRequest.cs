using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Admin;

public class AdminResetPasswordRequest
{
    [Required]
    public string NewPassword { get; set; } = string.Empty;
}
