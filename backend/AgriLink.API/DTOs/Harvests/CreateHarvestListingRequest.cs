using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Harvests;

public class CreateHarvestListingRequest
{
    [Required]
    public int CropId { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    [Required]
    public DateOnly HarvestDate { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal PricePerUnit { get; set; }

    [Required, MaxLength(150)]
    public string Location { get; set; } = string.Empty;
}
