using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Auth;

public class RegisterRequest
{
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string NIC { get; set; } = string.Empty;

    [MaxLength(50)]
    public string District { get; set; } = string.Empty;

    /// <summary>"Farmer" or "Buyer" — Officer/Admin accounts are never self-registered.</summary>
    [Required]
    public string Role { get; set; } = string.Empty;

    // Farmer-only, both required when Role is "Farmer".
    [MaxLength(50)]
    public string? FieldPlotNumber { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    // Buyer-only, all required when Role is "Buyer".
    [MaxLength(50)]
    public string? BusinessRegistrationNumber { get; set; }

    [MaxLength(20)]
    public string? BusinessPhone { get; set; }

    [MaxLength(100)]
    public string? LegalBusinessName { get; set; }
}
