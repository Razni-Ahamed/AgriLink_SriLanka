using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Farms;

public class UpdateFarmRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string District { get; set; } = string.Empty;

    [Range(0.01, 100000)]
    public decimal Area { get; set; }
}
