using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Admin;

public class UpdateUserRoleRequest
{
    /// <summary>"Officer" or "Buyer" — Farmer and Admin are never reachable through this endpoint.</summary>
    [Required]
    public string Role { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string District { get; set; } = string.Empty;

    /// <summary>Required when Role is "Officer".</summary>
    [MaxLength(100)]
    public string? Department { get; set; }

    /// <summary>Required when Role is "Buyer".</summary>
    [MaxLength(100)]
    public string? BusinessName { get; set; }
}
