using Microsoft.AspNetCore.Identity;

namespace AgriLink.API.Data;

public static class RoleSeeder
{
    public static readonly string[] Roles = { "Farmer", "Officer", "Buyer", "Admin" };

    public static async Task SeedAsync(RoleManager<IdentityRole<int>> roleManager)
    {
        foreach (var role in Roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(role));
            }
        }
    }
}
