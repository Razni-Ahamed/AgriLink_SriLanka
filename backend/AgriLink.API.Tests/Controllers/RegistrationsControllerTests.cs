using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Registrations;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// GET/POST /api/registrations/*: Farmer applications are approved by an Officer of the
/// applicant's own district or by an Admin; Buyer applications are Admin-only and must never
/// be visible to an Officer, in any district. Mirrors the scoping style covered for issues in
/// IssuesControllerOfficerScopeTests.cs.
/// </summary>
public class RegistrationsControllerTests
{
    private const int KandyOfficerUserId = 20;
    private const int GalleOfficerUserId = 21;
    private const int AdminUserId = 22;
    private const int KandyFarmerUserId = 30;
    private const int GalleFarmerUserId = 31;
    private const int BuyerUserId = 40;

    private static async Task<(AgriLinkDbContext Db, Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> UserManager, Mock<IAuditLogService> AuditLog, Mock<INotificationService> Notifications)> SeedDataAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);

        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension Services" });
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = KandyOfficerUserId, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 2, UserId = GalleOfficerUserId, DepartmentId = 1, District = "Galle" });

        await CreateUserAsync(userManager, KandyOfficerUserId, "kandy.officer@test.com", "Kandy Officer", "Officer");
        await CreateUserAsync(userManager, GalleOfficerUserId, "galle.officer@test.com", "Galle Officer", "Officer");
        await CreateUserAsync(userManager, AdminUserId, "admin@test.com", "The Admin", "Admin");

        var kandyFarmer = await CreateUserAsync(userManager, KandyFarmerUserId, "kandy.farmer@test.com", "Kandy Farmer", "Farmer", pending: true);
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = KandyFarmerUserId, NIC = "1", District = "Kandy", FieldPlotNumber = "P1", PhoneNumber = "071" });

        var galleFarmer = await CreateUserAsync(userManager, GalleFarmerUserId, "galle.farmer@test.com", "Galle Farmer", "Farmer", pending: true);
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 2, UserId = GalleFarmerUserId, NIC = "2", District = "Galle", FieldPlotNumber = "P2", PhoneNumber = "072" });

        var buyer = await CreateUserAsync(userManager, BuyerUserId, "buyer@test.com", "Test Buyer", "Buyer", pending: true);
        db.BuyerProfiles.Add(new BuyerProfile { BuyerProfileId = 1, UserId = BuyerUserId, BusinessName = "Buyer Co", District = "Kandy", BusinessRegistrationNumber = "BRN", BusinessPhone = "073" });

        await db.SaveChangesAsync();

        return (db, userManager, new Mock<IAuditLogService>(), new Mock<INotificationService>());
    }

    private static async Task<ApplicationUser> CreateUserAsync(
        Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> userManager,
        int id,
        string email,
        string fullName,
        string role,
        bool pending = false)
    {
        var user = new ApplicationUser
        {
            Id = id,
            UserName = email,
            Email = email,
            FullName = fullName,
            IsActive = !pending,
            RegistrationStatus = pending ? RegistrationStatus.Pending : RegistrationStatus.Approved,
        };
        await userManager.CreateAsync(user, "Password@123!");
        await userManager.AddToRoleAsync(user, role);
        return user;
    }

    private static RegistrationsController CreateController(
        AgriLinkDbContext db,
        Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> userManager,
        Mock<IAuditLogService> auditLog,
        Mock<INotificationService> notifications,
        int actingUserId,
        string role) =>
        new(userManager, db, new CurrentUserService(db), auditLog.Object, notifications.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    [Fact]
    public async Task Pending_Officer_OnlySeesOwnDistrictFarmers()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");

        var result = await controller.Pending();

        var list = Assert.IsAssignableFrom<List<PendingRegistrationResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        var entry = Assert.Single(list);
        Assert.Equal("Kandy Farmer", entry.FullName);
        Assert.Equal("Farmer", entry.Role);
    }

    [Fact]
    public async Task Pending_Officer_NeverSeesBuyerApplications()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");

        var result = await controller.Pending();

        var list = Assert.IsAssignableFrom<List<PendingRegistrationResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.DoesNotContain(list, r => r.Role == "Buyer");
    }

    [Fact]
    public async Task Pending_Admin_SeesFarmersFromEveryDistrictAndBuyers()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, AdminUserId, "Admin");

        var result = await controller.Pending();

        var list = Assert.IsAssignableFrom<List<PendingRegistrationResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(3, list.Count);
        Assert.Contains(list, r => r.Role == "Buyer");
        Assert.Contains(list, r => r.District == "Kandy" && r.Role == "Farmer");
        Assert.Contains(list, r => r.District == "Galle" && r.Role == "Farmer");
    }

    [Fact]
    public async Task Approve_OfficerOfOtherDistrict_IsForbidden()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, GalleOfficerUserId, "Officer");

        var result = await controller.Approve(KandyFarmerUserId);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task Approve_OfficerOfSameDistrict_ActivatesFarmer()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");

        var result = await controller.Approve(KandyFarmerUserId);

        Assert.IsType<OkObjectResult>(result.Result);
        var user = await db.Users.FindAsync(KandyFarmerUserId);
        Assert.True(user!.IsActive);
        Assert.Equal(RegistrationStatus.Approved, user.RegistrationStatus);
        notifications.Verify(n => n.NotifyAsync(KandyFarmerUserId, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Approve_OfficerOnBuyerApplication_IsForbidden()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");

        var result = await controller.Approve(BuyerUserId);

        Assert.IsType<ForbidResult>(result.Result);
        var user = await db.Users.FindAsync(BuyerUserId);
        Assert.Equal(RegistrationStatus.Pending, user!.RegistrationStatus);
    }

    [Fact]
    public async Task Approve_AdminOnBuyerApplication_Activates()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, AdminUserId, "Admin");

        var result = await controller.Approve(BuyerUserId);

        Assert.IsType<OkObjectResult>(result.Result);
        var user = await db.Users.FindAsync(BuyerUserId);
        Assert.True(user!.IsActive);
        Assert.Equal(RegistrationStatus.Approved, user.RegistrationStatus);
    }

    [Fact]
    public async Task Approve_Admin_CanApproveAnyDistrictFarmer()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, AdminUserId, "Admin");

        var result = await controller.Approve(GalleFarmerUserId);

        Assert.IsType<OkObjectResult>(result.Result);
        var user = await db.Users.FindAsync(GalleFarmerUserId);
        Assert.True(user!.IsActive);
    }

    [Fact]
    public async Task Reject_SetsInactiveWithReason_AndKeepsRejectedAccountInactive()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");

        var result = await controller.Reject(KandyFarmerUserId, new RejectRegistrationRequest { Reason = "NIC mismatch" });

        Assert.IsType<OkObjectResult>(result.Result);
        var user = await db.Users.FindAsync(KandyFarmerUserId);
        Assert.False(user!.IsActive);
        Assert.Equal(RegistrationStatus.Rejected, user.RegistrationStatus);
        Assert.Equal("NIC mismatch", user.RejectionReason);
    }

    [Fact]
    public async Task Approve_AlreadyDecidedApplication_ReturnsBadRequest()
    {
        var (db, userManager, auditLog, notifications) = await SeedDataAsync();
        var controller = CreateController(db, userManager, auditLog, notifications, KandyOfficerUserId, "Officer");
        await controller.Approve(KandyFarmerUserId);

        var result = await controller.Approve(KandyFarmerUserId);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
