using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Accounts;

public class VerifyPasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}
