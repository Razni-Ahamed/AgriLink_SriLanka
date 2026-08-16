namespace AgriLink.API.Models;

public class FarmerProfile
{
    public int FarmerProfileId { get; set; }
    public int UserId { get; set; }
    public string NIC { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<Farm> Farms { get; set; } = new List<Farm>();
}
