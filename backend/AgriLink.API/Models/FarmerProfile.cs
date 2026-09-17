namespace AgriLink.API.Models;

public class FarmerProfile
{
    public int FarmerProfileId { get; set; }
    public int UserId { get; set; }
    public string NIC { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? FieldPlotNumber { get; set; }
    public string? PhoneNumber { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public ICollection<Farm> Farms { get; set; } = new List<Farm>();
}
