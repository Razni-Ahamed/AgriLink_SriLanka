namespace AgriLink.API.Models;

public class OfficerProfile
{
    public int OfficerProfileId { get; set; }
    public int UserId { get; set; }
    public int DepartmentId { get; set; }
    public string District { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
    public Department Department { get; set; } = null!;
}
