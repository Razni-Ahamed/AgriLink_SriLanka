namespace AgriLink.API.Models;

public class Crop
{
    public int CropId { get; set; }
    public int FieldId { get; set; }
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public DateOnly PlantingDate { get; set; }
    public DateOnly ExpectedHarvestDate { get; set; }
    public decimal ExpectedQuantity { get; set; }
    public CropStatus Status { get; set; } = CropStatus.Seeded;

    public Field Field { get; set; } = null!;
    public ICollection<CropActivity> Activities { get; set; } = new List<CropActivity>();
}
