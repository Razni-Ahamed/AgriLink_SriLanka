using System.ComponentModel.DataAnnotations;
using AgriLink.API.DTOs.Harvests;

namespace AgriLink.API.DTOs.PurchaseRequests;

public class CreatePurchaseRequestRequest
{
    [Required]
    public int HarvestId { get; set; }

    [Required, Range(0.01, HarvestLimits.MaxQuantityKg)]
    public decimal RequestedQuantity { get; set; }

    [MaxLength(500)]
    public string? Message { get; set; }
}
