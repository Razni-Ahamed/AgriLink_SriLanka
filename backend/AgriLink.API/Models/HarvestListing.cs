namespace AgriLink.API.Models;

public class HarvestListing
{
    public int HarvestId { get; set; }
    public int FarmerProfileId { get; set; }
    public int CropId { get; set; }
    public decimal Quantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public DateOnly HarvestDate { get; set; }
    public decimal PricePerUnit { get; set; }
    public string Location { get; set; } = string.Empty;
    public HarvestStatus Status { get; set; } = HarvestStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FarmerProfile FarmerProfile { get; set; } = null!;
    public Crop Crop { get; set; } = null!;
    public ICollection<PurchaseRequest> PurchaseRequests { get; set; } = new List<PurchaseRequest>();
}
