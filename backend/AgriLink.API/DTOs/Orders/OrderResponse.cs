namespace AgriLink.API.DTOs.Orders;

public class OrderResponse
{
    public int OrderId { get; set; }
    public int RequestId { get; set; }
    public int FarmerProfileId { get; set; }
    public int BuyerProfileId { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public DateTime? CompletedAt { get; set; }
}
