namespace AgriLink.API.DTOs.Auth;

/// <summary>
/// The signed-in user's own profile (GET /api/users/me, and the result of every /me update). Never
/// returned for anyone else; it carries the NIC and phone number.
/// </summary>
public class UserProfileResponse
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? NIC { get; set; }
    public string? District { get; set; }

    public string Username { get; set; } = string.Empty;

    /// <summary>Optional; the UI falls back to <see cref="FullName"/> when it is null.</summary>
    public string? DisplayName { get; set; }

    /// <summary>Public https URL of the user's photo; null means the UI shows the role's default avatar.</summary>
    public string? ProfilePhotoUrl { get; set; }

    /// <summary>
    /// Farmer: FarmerProfile.PhoneNumber. Buyer: BuyerProfile.BusinessPhone. Officer/Admin: the
    /// optional Identity PhoneNumber.
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>Farmer only.</summary>
    public string? FieldPlotNumber { get; set; }

    /// <summary>Buyer only.</summary>
    public string? BusinessName { get; set; }

    /// <summary>Buyer only.</summary>
    public string? BusinessRegistrationNumber { get; set; }

    /// <summary>Officer only.</summary>
    public string? DepartmentName { get; set; }

    /// <summary>When the user may next change their username (UTC); null means they may change it now.</summary>
    public DateTime? UsernameChangeAvailableAt { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// The caller's FarmerProfileId when the account is a Farmer, otherwise null. Lets the
    /// client tell whether a harvest listing (which carries a FarmerProfileId) is the
    /// caller's own — the ownership test PUT /api/harvests/{id} already applies server-side.
    /// </summary>
    public int? FarmerProfileId { get; set; }
}
