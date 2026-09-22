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

    // Contact details, so the farmer and buyer on an order can actually reach each other —
    // only ever returned to the order's own farmer/buyer or to Admin (see the checks in
    // OrdersController).
    public string FarmerName { get; set; } = string.Empty;
    public string? FarmerPhone { get; set; }
    public string FarmerEmail { get; set; } = string.Empty;
    public string FarmerDistrict { get; set; } = string.Empty;
    /// <summary>The farmer's public profile photo URL; null shows the default Farmer avatar.</summary>
    public string? FarmerPhotoUrl { get; set; }

    public string BuyerName { get; set; } = string.Empty;
    public string BuyerBusinessName { get; set; } = string.Empty;
    /// <summary>Null for a Buyer account created by Admin without a business phone on file.</summary>
    public string? BuyerPhone { get; set; }
    public string BuyerEmail { get; set; } = string.Empty;
    public string BuyerDistrict { get; set; } = string.Empty;
    /// <summary>The buyer's public profile photo URL; null shows the default Buyer avatar.</summary>
    public string? BuyerPhotoUrl { get; set; }

    // Listing context, resolved through the order's originating request/listing so neither
    // side has to look the crop or price up separately.
    public string CropType { get; set; } = string.Empty;
    public decimal PricePerUnit { get; set; }
    public string HarvestLocation { get; set; } = string.Empty;
}
