namespace AgriLink.API.Models;

/// <summary>
/// Admin-managed list of departments an Officer account can belong to. Replaces the free-text
/// OfficerProfile.Department string so officer department names come from a controlled
/// vocabulary instead of whatever an admin happened to type.
/// </summary>
public class Department
{
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OfficerProfile> OfficerProfiles { get; set; } = new List<OfficerProfile>();
}
