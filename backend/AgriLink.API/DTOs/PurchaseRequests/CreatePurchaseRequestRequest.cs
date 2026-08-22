using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.PurchaseRequests;

public class CreatePurchaseRequestRequest
{
    [Required]
    public int HarvestId { get; set; }

    [Required, Range(0.01, double.MaxValue)]
    public decimal RequestedQuantity { get; set; }

    public string? Message { get; set; }
}
