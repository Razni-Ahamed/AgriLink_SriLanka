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

    // Who sent it — deliberately no phone/email here (unlike OrderResponse): a purchase
    // request isn't a deal yet, so the buyer's direct contact details stay withheld until the
    // farmer accepts it and an order exists.
    public string BuyerName { get; set; } = string.Empty;
    public string BuyerBusinessName { get; set; } = string.Empty;
}
