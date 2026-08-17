namespace AgriLink.API.DTOs.Farms;

public class FarmDto
{
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public decimal Area { get; set; }
    public DateTime CreatedAt { get; set; }
}
