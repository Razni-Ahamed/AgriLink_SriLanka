using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Crops;

public class CreateCropRequest
{
    [Required, MaxLength(100)]
    public string CropType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Variety { get; set; } = string.Empty;

    [Required]
    public DateOnly PlantingDate { get; set; }

    [Required]
    public DateOnly ExpectedHarvestDate { get; set; }

    [Range(0.01, 1000000)]
    public decimal ExpectedQuantity { get; set; }
}
