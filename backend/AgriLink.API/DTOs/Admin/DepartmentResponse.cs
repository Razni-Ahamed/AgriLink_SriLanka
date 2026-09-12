namespace AgriLink.API.DTOs.Admin;

public class DepartmentResponse
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
