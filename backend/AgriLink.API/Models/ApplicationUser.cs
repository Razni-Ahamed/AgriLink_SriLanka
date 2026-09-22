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

    /// <summary>Optional name shown in the header and on the profile; the UI falls back to FullName.</summary>
    public string? DisplayName { get; set; }

    /// <summary>Public delivery URL of the user's own photo; null means the role's default avatar.</summary>
    public string? ProfilePhotoUrl { get; set; }

    /// <summary>Storage id of <see cref="ProfilePhotoUrl"/>, kept so the old photo can be deleted on replace.</summary>
    public string? ProfilePhotoKey { get; set; }

    /// <summary>
    /// When the user last chose a new username themselves (UTC). Null means the next change is free —
    /// which covers usernames the system generated and the one picked at sign-up.
    /// </summary>
    public DateTime? UsernameChangedAt { get; set; }

    public FarmerProfile? FarmerProfile { get; set; }
    public BuyerProfile? BuyerProfile { get; set; }
    public OfficerProfile? OfficerProfile { get; set; }
}
