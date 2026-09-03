using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;

namespace AgriLink.API.Data;

/// <summary>
/// Creates the first Admin account. Without it the system deadlocks: only an
/// Admin can create privileged users, and no other code path assigns that role
/// (public registration is Farmer-only, AdminController creates Officer/Buyer).
/// </summary>
public static class AdminSeeder
{
    public const string AdminRole = "Admin";

    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        AdminSeedOptions options,
        ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(options.Email) || string.IsNullOrWhiteSpace(options.Password))
        {
            logger.LogInformation("Admin seeding skipped: AdminSeed:Email/Password not configured.");
            return;
        }

        var existing = await userManager.FindByEmailAsync(options.Email);
        if (existing is not null)
        {
            // Recover from a half-finished seed (user row created, role assignment failed).
            if (!await userManager.IsInRoleAsync(existing, AdminRole))
            {
                await userManager.AddToRoleAsync(existing, AdminRole);
                logger.LogInformation("Granted the Admin role to the existing {Email} account.", options.Email);
            }

            return;
        }

        var admin = new ApplicationUser
        {
            UserName = options.Email,
            Email = options.Email,
            FullName = options.FullName,
            EmailConfirmed = true,
        };

        var createResult = await userManager.CreateAsync(admin, options.Password);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            logger.LogError("Could not seed the admin account: {Errors}", errors);
            return;
        }

        await userManager.AddToRoleAsync(admin, AdminRole);
        logger.LogInformation("Seeded the admin account {Email}.", options.Email);
    }
}

public class AdminSeedOptions
{
    public const string SectionName = "AdminSeed";

    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = "AgriLink Administrator";
}
