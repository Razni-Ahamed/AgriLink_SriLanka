namespace AgriLink.API.DTOs.Admin;

public class AdminUserSummary
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    /// <summary>Public https URL; null shows the role's default avatar.</summary>
    public string? ProfilePhotoUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? District { get; set; }
    /// <summary>Populated only for Officer accounts.</summary>
    public string? Department { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
