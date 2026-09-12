namespace AgriLink.API.DTOs.Crops;

/// <summary>
/// A crop plus the farm/field it sits in. The plain <see cref="CropDto"/> carries only a
/// FieldId, which is meaningless in a picker — a farmer choosing which crop to report an issue
/// against, or to list for sale, needs to see "Paddy — North Field, Green Acres", not "#42".
/// </summary>
public class FarmerCropSummary
{
    public int CropId { get; set; }
    public string CropType { get; set; } = string.Empty;
    public string Variety { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly PlantingDate { get; set; }
    public DateOnly ExpectedHarvestDate { get; set; }
    public decimal ExpectedQuantity { get; set; }

    public int FieldId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public int FarmId { get; set; }
    public string FarmName { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
}
