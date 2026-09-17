using Microsoft.AspNetCore.Identity;

namespace AgriLink.API.Models;

public class ApplicationUser : IdentityUser<int>
{
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Self-registered Farmer/Buyer accounts start Pending and stay inactive until an
    /// Officer (farmers, own district) or Admin (buyers, any farmer) approves them.
    /// Admin-created accounts (Officer/Buyer via AdminController) default to Approved.
    /// </summary>
    public RegistrationStatus RegistrationStatus { get; set; } = RegistrationStatus.Approved;
    public string? RejectionReason { get; set; }

    public FarmerProfile? FarmerProfile { get; set; }
    public BuyerProfile? BuyerProfile { get; set; }
    public OfficerProfile? OfficerProfile { get; set; }
}
