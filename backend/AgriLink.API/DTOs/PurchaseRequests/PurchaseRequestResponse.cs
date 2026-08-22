namespace AgriLink.API.DTOs.PurchaseRequests;

public class PurchaseRequestResponse
{
    public int RequestId { get; set; }
    public int HarvestId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal RequestedQuantity { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
