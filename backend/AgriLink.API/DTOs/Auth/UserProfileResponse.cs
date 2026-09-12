namespace AgriLink.API.DTOs.Auth;

public class UserProfileResponse
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? NIC { get; set; }
    public string? District { get; set; }

    /// <summary>
    /// The caller's FarmerProfileId when the account is a Farmer, otherwise null. Lets the
    /// client tell whether a harvest listing (which carries a FarmerProfileId) is the
    /// caller's own — the ownership test PUT /api/harvests/{id} already applies server-side.
    /// </summary>
    public int? FarmerProfileId { get; set; }
}
