using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// PUT /api/admin/users/{id}/profile — Admin editing any user's identity/contact details
/// directly. [Authorize(Roles = "Admin")] is enforced by the ASP.NET pipeline, not exercised by
/// these controller-level tests (same convention as every other controller test here).
/// </summary>
public class AdminControllerProfileTests
{
    private const string Password = "AgriLink@Test.2026!";

    private static async Task<(AdminController Controller, AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser Admin)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);

        var admin = new ApplicationUser { UserName = "admin@agrilink.lk", Email = "admin@agrilink.lk", FullName = "Admin One" };
        await userManager.CreateAsync(admin, Password);
        await userManager.AddToRoleAsync(admin, "Admin");

        var controller = new AdminController(userManager, db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(admin.Id, "Admin") },
            },
        };

        return (controller, db, userManager, admin);
    }

    private static async Task<ApplicationUser> CreateFarmerAsync(UserManager<ApplicationUser> users, AgriLinkDbContext db)
    {
        var user = new ApplicationUser { UserName = "farmer@agrilink.lk", Email = "farmer@agrilink.lk", FullName = "Farmer One" };
        await users.CreateAsync(user, Password);
        await users.AddToRoleAsync(user, "Farmer");
        db.FarmerProfiles.Add(new FarmerProfile
        {
            UserId = user.Id, NIC = "199912345678", District = "Kandy", PhoneNumber = "0771234567", FieldPlotNumber = "PLOT-1",
        });
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task UpdateUserProfile_UnknownUser_ReturnsNotFound()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = await controller.UpdateUserProfile(999999, new AdminUpdateUserProfileRequest { FullName = "New Name" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserProfile_UpdatesOnlyTheFieldsSent()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { FullName = "Updated Name" });

        Assert.IsType<OkObjectResult>(result.Result);
        var refreshed = await db.Users.SingleAsync(u => u.Id == farmer.Id);
        Assert.Equal("Updated Name", refreshed.FullName);
        // Nothing else moved: the DTO carries no Role/IsActive/RegistrationStatus at all, so
        // there is nothing in the request body that could ever touch them.
        Assert.True(refreshed.IsActive);
        Assert.Equal(RegistrationStatus.Approved, refreshed.RegistrationStatus);
        Assert.Equal("farmer@agrilink.lk", refreshed.Email);
    }

    [Fact]
    public async Task UpdateUserProfile_InvalidDistrict_ReturnsBadRequest()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { District = "Notaplace" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Kandy", (await db.FarmerProfiles.SingleAsync()).District);
    }

    [Fact]
    public async Task UpdateUserProfile_ValidDistrict_UpdatesFarmerProfileDistrict()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { District = "Galle" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("Galle", (await db.FarmerProfiles.SingleAsync()).District);
    }

    [Fact]
    public async Task UpdateUserProfile_EmailAlreadyTaken_ReturnsConflict()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { Email = "admin@agrilink.lk" });

        Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal("farmer@agrilink.lk", (await db.Users.SingleAsync(u => u.Id == farmer.Id)).Email);
    }

    [Fact]
    public async Task UpdateUserProfile_EmailChange_RotatesSecurityStamp()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);
        var stampBefore = farmer.SecurityStamp;

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { Email = "new-farmer@agrilink.lk" });

        Assert.IsType<OkObjectResult>(result.Result);
        var refreshed = await db.Users.SingleAsync(u => u.Id == farmer.Id);
        Assert.Equal("new-farmer@agrilink.lk", refreshed.Email);
        Assert.NotEqual(stampBefore, refreshed.SecurityStamp);
    }

    [Fact]
    public async Task UpdateUserProfile_OverwritingAFieldWithAPendingRequest_ClosesItAndNotifiesUser()
    {
        var (controller, db, users, admin) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);
        db.ProfileChangeRequests.Add(new ProfileChangeRequest
        {
            UserId = farmer.Id, Field = ChangeRequestField.FullName, OldValue = "Farmer One", NewValue = "Requested Name",
            Status = ChangeRequestStatus.Pending,
        });
        await db.SaveChangesAsync();

        await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { FullName = "Admin-Set Name" });

        var request = await db.ProfileChangeRequests.SingleAsync();
        Assert.Equal(ChangeRequestStatus.Rejected, request.Status);
        Assert.Equal(admin.Id, request.DecidedByUserId);
        Assert.Contains("administrator", request.RejectionReason, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == farmer.Id);
    }

    [Fact]
    public async Task UpdateUserProfile_OfficerAccount_CanClearPhone()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = new ApplicationUser { UserName = "officer@agrilink.lk", Email = "officer@agrilink.lk", FullName = "Officer One", PhoneNumber = "0771234567" };
        await users.CreateAsync(officer, Password);
        await users.AddToRoleAsync(officer, "Officer");
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { UserId = officer.Id, DepartmentId = 1, District = "Kandy" });
        await db.SaveChangesAsync();

        var result = await controller.UpdateUserProfile(officer.Id, new AdminUpdateUserProfileRequest { PhoneNumber = "" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Null((await db.Users.SingleAsync(u => u.Id == officer.Id)).PhoneNumber);
    }

    [Fact]
    public async Task UpdateUserProfile_FarmerAccount_CannotClearPhone()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserProfile(farmer.Id, new AdminUpdateUserProfileRequest { PhoneNumber = "" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("0771234567", (await db.FarmerProfiles.SingleAsync()).PhoneNumber);
    }

    [Fact]
    public async Task UpdateUserProfile_NicOnOfficerAccount_ReturnsBadRequest()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = new ApplicationUser { UserName = "officer@agrilink.lk", Email = "officer@agrilink.lk", FullName = "Officer One" };
        await users.CreateAsync(officer, Password);
        await users.AddToRoleAsync(officer, "Officer");
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { UserId = officer.Id, DepartmentId = 1, District = "Kandy" });
        await db.SaveChangesAsync();

        var result = await controller.UpdateUserProfile(officer.Id, new AdminUpdateUserProfileRequest { NIC = "199912345678" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
