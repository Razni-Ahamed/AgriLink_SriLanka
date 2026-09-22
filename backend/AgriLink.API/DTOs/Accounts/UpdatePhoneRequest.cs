using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Accounts;

public class UpdatePhoneRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>Required for Farmer/Buyer; empty or omitted clears it for Officer/Admin.</summary>
    public string? PhoneNumber { get; set; }
}
