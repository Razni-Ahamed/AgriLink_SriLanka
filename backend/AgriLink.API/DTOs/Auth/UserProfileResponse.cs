namespace AgriLink.API.DTOs.Auth;

public class UserProfileResponse
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? NIC { get; set; }
    public string? District { get; set; }
}
