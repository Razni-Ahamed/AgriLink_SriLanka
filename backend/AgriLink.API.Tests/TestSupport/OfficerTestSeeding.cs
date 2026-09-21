using AgriLink.API.Data;
using AgriLink.API.Models;

namespace AgriLink.API.Tests.TestSupport;

public static class OfficerTestSeeding
{
    /// <summary>
    /// Gives an Officer principal the OfficerProfile the controllers use to scope them to a
    /// district. Idempotent, so controller-factory helpers can call it on every construction.
    /// </summary>
    public static void EnsureOfficerProfile(AgriLinkDbContext db, int userId, string district = "Kandy")
    {
        if (db.OfficerProfiles.Any(o => o.UserId == userId))
        {
            return;
        }

        if (!db.Departments.Any())
        {
            db.Departments.Add(new Department { Name = "Extension" });
        }

        db.OfficerProfiles.Add(new OfficerProfile
        {
            UserId = userId,
            DepartmentId = db.Departments.Local.FirstOrDefault()?.DepartmentId ?? db.Departments.First().DepartmentId,
            District = district,
        });
        db.SaveChanges();
    }
}
