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

    // Denormalized from the referenced listing so a buyer's "sent requests" list (and a
    // farmer's "incoming requests" list, if they have more than one active listing) can show
    // which crop/price the request was actually about without a second round trip.
    public string CropType { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public decimal PricePerUnit { get; set; }
}
