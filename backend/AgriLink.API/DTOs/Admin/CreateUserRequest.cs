using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Admin;

public class CreateUserRequest
{
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    /// <summary>"Officer" or "Buyer".</summary>
    [Required]
    public string Role { get; set; } = string.Empty;

    [MaxLength(50)]
    public string District { get; set; } = string.Empty;

    /// <summary>Required when Role is "Officer".</summary>
    [MaxLength(100)]
    public string? Department { get; set; }

    /// <summary>Required when Role is "Buyer".</summary>
    [MaxLength(100)]
    public string? BusinessName { get; set; }
}
