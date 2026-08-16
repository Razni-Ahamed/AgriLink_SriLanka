namespace AgriLink.API.Models;

public class OfficerProfile
{
    public int OfficerProfileId { get; set; }
    public int UserId { get; set; }
    public string Department { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
