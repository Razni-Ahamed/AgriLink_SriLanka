namespace AgriLink.API.Models;

public class PurchaseRequest
{
    public int RequestId { get; set; }
    public int HarvestId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal RequestedQuantity { get; set; }
    public string Message { get; set; } = string.Empty;
    public PurchaseRequestStatus Status { get; set; } = PurchaseRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public HarvestListing Harvest { get; set; } = null!;
    public BuyerProfile BuyerProfile { get; set; } = null!;
    public Order? Order { get; set; }
}
