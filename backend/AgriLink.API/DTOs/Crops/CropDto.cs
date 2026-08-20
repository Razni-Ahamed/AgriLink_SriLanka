namespace AgriLink.API.DTOs.Crops;

public class CropDto
{
    public int CropId { get; set; }
    public int FieldId { get; set; }
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public DateOnly PlantingDate { get; set; }
    public DateOnly ExpectedHarvestDate { get; set; }
    public decimal ExpectedQuantity { get; set; }
    public string Status { get; set; } = string.Empty;
}
