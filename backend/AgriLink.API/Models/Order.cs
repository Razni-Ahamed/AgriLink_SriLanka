namespace AgriLink.API.Models;

public class Order
{
    public int OrderId { get; set; }
    public int RequestId { get; set; }
    public int FarmerProfileId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Confirmed;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public PurchaseRequest Request { get; set; } = null!;
    public FarmerProfile FarmerProfile { get; set; } = null!;
    public BuyerProfile BuyerProfile { get; set; } = null!;
}
