using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Harvests;

public class UpdateHarvestListingRequest
{
    public HarvestStatus? Status { get; set; }
    public decimal? PricePerUnit { get; set; }
    public string? Location { get; set; }
    public DateOnly? HarvestDate { get; set; }
}
