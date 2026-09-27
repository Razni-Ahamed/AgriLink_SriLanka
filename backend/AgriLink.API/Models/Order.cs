namespace AgriLink.API.Models;

public class Order
{
    public int OrderId { get; set; }
    public int RequestId { get; set; }
    public int FarmerProfileId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal TotalQuantity { get; set; }

    /// <summary>The agreed price, copied from the request, so the order never follows later listing edits.</summary>
    public decimal PricePerUnit { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Confirmed;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Postgres's xmin, used as a concurrency token: two people changing this row at the same moment
    /// (accepting requests on one listing, completing and cancelling one order) can no longer both
    /// win — the second save fails instead of silently overwriting the first.
    /// </summary>
    public uint Version { get; set; }

    public PurchaseRequest Request { get; set; } = null!;
    public FarmerProfile FarmerProfile { get; set; } = null!;
    public BuyerProfile BuyerProfile { get; set; } = null!;
}
