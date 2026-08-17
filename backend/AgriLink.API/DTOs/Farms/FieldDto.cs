namespace AgriLink.API.DTOs.Farms;

public class FieldDto
{
    public int FieldId { get; set; }
    public int FarmId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Area { get; set; }
}
