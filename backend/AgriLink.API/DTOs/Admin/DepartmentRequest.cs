using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Admin;

/// <summary>Shared body shape for both creating and renaming a department.</summary>
public class DepartmentRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
}
