using System.ComponentModel.DataAnnotations;
using AgriLink.API.Models;

namespace AgriLink.API.DTOs.Harvests;

public class UpdateHarvestListingRequest
{
    public HarvestStatus? Status { get; set; }
    public decimal? PricePerUnit { get; set; }
    [MaxLength(150)]
    public string? Location { get; set; }
    public DateOnly? HarvestDate { get; set; }
}
