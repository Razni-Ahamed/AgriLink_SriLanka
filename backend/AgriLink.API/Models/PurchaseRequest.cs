namespace AgriLink.API.Models;

public class PurchaseRequest
{
    public int RequestId { get; set; }
    public int HarvestId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal RequestedQuantity { get; set; }

    /// <summary>
    /// The listing's price when the buyer sent the request — what they agreed to pay. An accepted
    /// request is charged at this price even if the farmer has changed the listing since.
    /// </summary>
    public decimal PricePerUnit { get; set; }
    public string Message { get; set; } = string.Empty;
    public PurchaseRequestStatus Status { get; set; } = PurchaseRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Postgres's xmin, used as a concurrency token: two people changing this row at the same moment
    /// (accepting requests on one listing, completing and cancelling one order) can no longer both
    /// win — the second save fails instead of silently overwriting the first.
    /// </summary>
    public uint Version { get; set; }

    public HarvestListing Harvest { get; set; } = null!;
    public BuyerProfile BuyerProfile { get; set; } = null!;
    public Order? Order { get; set; }
}
