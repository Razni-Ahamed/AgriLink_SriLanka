using Microsoft.AspNetCore.Identity;

namespace AgriLink.API.Models;

public class ApplicationUser : IdentityUser<int>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FarmerProfile? FarmerProfile { get; set; }
    public BuyerProfile? BuyerProfile { get; set; }
    public OfficerProfile? OfficerProfile { get; set; }
}
