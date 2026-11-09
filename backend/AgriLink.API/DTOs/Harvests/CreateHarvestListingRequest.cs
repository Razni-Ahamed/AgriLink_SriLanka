using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Harvests;

public class CreateHarvestListingRequest
{
    [Required]
    public int CropId { get; set; }

    [Required, Range(0.01, HarvestLimits.MaxQuantityKg)]
    public decimal Quantity { get; set; }

    [Required]
    public DateOnly HarvestDate { get; set; }

    [Required, Range(0.01, HarvestLimits.MaxPricePerKg)]
    public decimal PricePerUnit { get; set; }

    /// <summary>What the quantity and price are counted in; Kg when left out (older app versions).</summary>
    public QuantityUnit Unit { get; set; } = QuantityUnit.Kg;

    [Required, MaxLength(150)]
    public string Location { get; set; } = string.Empty;
}
