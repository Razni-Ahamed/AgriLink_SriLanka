namespace AgriLink.API.Models;

public class Field
{
    public int FieldId { get; set; }
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Area { get; set; }

    public Farm Farm { get; set; } = null!;
    public ICollection<Crop> Crops { get; set; } = new List<Crop>();
}
