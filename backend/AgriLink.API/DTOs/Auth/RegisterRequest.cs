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
}
