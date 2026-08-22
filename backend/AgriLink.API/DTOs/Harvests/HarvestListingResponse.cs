namespace AgriLink.API.DTOs.Harvests;

public class HarvestListingResponse
{
    public int HarvestId { get; set; }
    public int FarmerProfileId { get; set; }
    public int CropId { get; set; }
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public DateOnly HarvestDate { get; set; }
    public decimal PricePerUnit { get; set; }
    public string Location { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
