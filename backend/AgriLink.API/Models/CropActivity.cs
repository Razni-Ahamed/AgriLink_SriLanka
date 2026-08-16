namespace AgriLink.API.Models;

public class CropActivity
{
    public int ActivityId { get; set; }
    public int CropId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public DateOnly ActivityDate { get; set; }
    public string? Description { get; set; }

    public Crop Crop { get; set; } = null!;
}
