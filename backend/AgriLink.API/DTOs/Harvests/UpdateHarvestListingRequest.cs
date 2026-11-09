using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Harvests;

public class UpdateHarvestListingRequest
{
    public HarvestStatus? Status { get; set; }
    [Range(0.01, HarvestLimits.MaxPricePerKg)]
    public decimal? PricePerUnit { get; set; }
    [MaxLength(150)]
    public string? Location { get; set; }
    public DateOnly? HarvestDate { get; set; }

    /// <summary>Only while nobody has sent a request on the listing, since a request's quantity is
    /// counted in the listing's unit.</summary>
    public QuantityUnit? Unit { get; set; }
}
