using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Farms;

public class CreateFieldRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Range(0.01, 100000)]
    public decimal Area { get; set; }
}
