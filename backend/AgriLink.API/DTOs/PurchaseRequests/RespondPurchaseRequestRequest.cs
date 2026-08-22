using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.PurchaseRequests;

public class RespondPurchaseRequestRequest
{
    [Required]
    public string Action { get; set; } = string.Empty;
}
