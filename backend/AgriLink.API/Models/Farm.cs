namespace AgriLink.API.Models;

public class Farm
{
    public int FarmId { get; set; }
    public int FarmerProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public decimal Area { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FarmerProfile FarmerProfile { get; set; } = null!;
    public ICollection<Field> Fields { get; set; } = new List<Field>();
}
