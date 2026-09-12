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

public class AdminControllerTests
{
    private static async Task<(AdminController Controller, AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser Admin)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);

        var admin = new ApplicationUser { UserName = "admin@agrilink.lk", Email = "admin@agrilink.lk", FullName = "AgriLink Administrator" };
        await userManager.CreateAsync(admin, "Admin@AgriLink.2026!");
        await userManager.AddToRoleAsync(admin, "Admin");

        var currentUser = new CurrentUserService(db);
        var auditLog = new AuditLogService(db);

        // The Identity store assigns admin.Id on CreateAsync, so the acting principal is built
        // from whatever id it actually got rather than a hardcoded value — reassigning a saved
        // entity's own primary key afterwards is not something EF Core supports safely.
        var controller = new AdminController(userManager, db, currentUser, auditLog)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(admin.Id, "Admin"),
                },
            },
        };

        return (controller, db, userManager, admin);
    }

    private static async Task<int> EnsureDepartmentAsync(AgriLinkDbContext db, string name = "Extension")
    {
        var existing = await db.Departments.FirstOrDefaultAsync(d => d.Name == name);
        if (existing is not null)
        {
            return existing.DepartmentId;
        }

        var department = new Department { Name = name };
        db.Departments.Add(department);
        await db.SaveChangesAsync();
        return department.DepartmentId;
    }

    private static async Task<ApplicationUser> CreateOfficerAsync(UserManager<ApplicationUser> users, AgriLinkDbContext db, string district = "Kandy", string department = "Extension")
    {
        var departmentId = await EnsureDepartmentAsync(db, department);
        var user = new ApplicationUser { UserName = "officer@agrilink.lk", Email = "officer@agrilink.lk", FullName = "Test Officer" };
        await users.CreateAsync(user, "Officer@AgriLink.2026!");
        await users.AddToRoleAsync(user, "Officer");
        db.OfficerProfiles.Add(new OfficerProfile { UserId = user.Id, DepartmentId = departmentId, District = district });
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<ApplicationUser> CreateFarmerAsync(UserManager<ApplicationUser> users, AgriLinkDbContext db)
    {
        var user = new ApplicationUser { UserName = "farmer@agrilink.lk", Email = "farmer@agrilink.lk", FullName = "Test Farmer" };
        await users.CreateAsync(user, "Farmer@AgriLink.2026!");
        await users.AddToRoleAsync(user, "Farmer");
        db.FarmerProfiles.Add(new FarmerProfile { UserId = user.Id, NIC = "123456789V", District = "Galle" });
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task CreateUser_Officer_CreatesProfileAndRecordsAudit()
    {
        var (controller, db, _, admin) = await CreateAsync();
        var departmentId = await EnsureDepartmentAsync(db, "Crop Extension");

        var result = await controller.CreateUser(new CreateUserRequest
        {
            FullName = "New Officer",
            Email = "new.officer@agrilink.lk",
            Password = "Officer@AgriLink.2026!",
            Role = "Officer",
            District = "Matara",
            DepartmentId = departmentId,
        });

        var created = Assert.IsType<CreateUserResponse>(Assert.IsType<ObjectResult>(result.Result).Value);
        Assert.Equal("Officer", created.Role);

        var profile = await db.OfficerProfiles.FirstOrDefaultAsync(o => o.UserId == created.UserId);
        Assert.NotNull(profile);
        Assert.Equal("Matara", profile!.District);
        Assert.Equal(departmentId, profile.DepartmentId);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == created.UserId && a.Action == "UserCreated");
        Assert.NotNull(auditLog);
        Assert.Equal(admin.Id, auditLog!.UserId);
        Assert.Equal("Officer", auditLog.NewValue);
    }

    [Fact]
    public async Task CreateUser_UnknownRole_ReturnsBadRequest()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = await controller.CreateUser(new CreateUserRequest
        {
            FullName = "Someone",
            Email = "someone@agrilink.lk",
            Password = "Someone@AgriLink.2026!",
            Role = "Farmer",
            District = "Kandy",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateUser_InvalidDistrict_ReturnsBadRequest()
    {
        var (controller, db, _, _) = await CreateAsync();
        var departmentId = await EnsureDepartmentAsync(db);

        var result = await controller.CreateUser(new CreateUserRequest
        {
            FullName = "Someone",
            Email = "someone@agrilink.lk",
            Password = "Someone@AgriLink.2026!",
            Role = "Officer",
            District = "Notaplace",
            DepartmentId = departmentId,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateUser_OfficerWithoutDepartmentId_ReturnsBadRequest()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = await controller.CreateUser(new CreateUserRequest
        {
            FullName = "Someone",
            Email = "someone@agrilink.lk",
            Password = "Someone@AgriLink.2026!",
            Role = "Officer",
            District = "Kandy",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateUser_OfficerWithUnknownDepartmentId_ReturnsBadRequest()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = await controller.CreateUser(new CreateUserRequest
        {
            FullName = "Someone",
            Email = "someone@agrilink.lk",
            Password = "Someone@AgriLink.2026!",
            Role = "Officer",
            District = "Kandy",
            DepartmentId = 999,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetRoles_ReturnsAllFourSeededRoles()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = controller.GetRoles();

        var roles = Assert.IsType<OkObjectResult>(result.Result).Value as List<string>;
        Assert.NotNull(roles);
        Assert.Equal(new[] { "Farmer", "Officer", "Buyer", "Admin" }, roles);
    }

    [Fact]
    public async Task GetUsers_ReturnsDistrictFromTheMatchingProfileType()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db, district: "Jaffna", department: "Extension Services");
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.GetUsers();

        var summaries = Assert.IsType<OkObjectResult>(result.Result).Value as List<AdminUserSummary>;
        Assert.NotNull(summaries);

        var officerSummary = summaries!.Single(s => s.UserId == officer.Id);
        Assert.Equal("Officer", officerSummary.Role);
        Assert.Equal("Jaffna", officerSummary.District);
        Assert.Equal("Extension Services", officerSummary.Department);

        var farmerSummary = summaries.Single(s => s.UserId == farmer.Id);
        Assert.Equal("Farmer", farmerSummary.Role);
        Assert.Equal("Galle", farmerSummary.District);
    }

    [Fact]
    public async Task UpdateUserRole_OfficerToBuyer_SwapsProfileAndRecordsAudit()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db);

        var result = await controller.UpdateUserRole(officer.Id, new UpdateUserRoleRequest
        {
            Role = "Buyer",
            District = "Kandy",
            BusinessName = "Kandy Produce Traders",
        });

        var summary = Assert.IsType<AdminUserSummary>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Buyer", summary.Role);

        Assert.Null(await db.OfficerProfiles.FirstOrDefaultAsync(o => o.UserId == officer.Id));
        var buyerProfile = await db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == officer.Id);
        Assert.NotNull(buyerProfile);
        Assert.Equal("Kandy Produce Traders", buyerProfile!.BusinessName);

        var roles = await users.GetRolesAsync(officer);
        Assert.Equal(new[] { "Buyer" }, roles);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == officer.Id && a.Action == "RoleChanged");
        Assert.NotNull(auditLog);
        Assert.Equal("Officer", auditLog!.OldValue);
        Assert.Equal("Buyer", auditLog.NewValue);
    }

    [Fact]
    public async Task UpdateUserRole_TargetIsFarmer_ReturnsBadRequest()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);

        var result = await controller.UpdateUserRole(farmer.Id, new UpdateUserRoleRequest { Role = "Buyer", District = "Kandy", BusinessName = "X" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserRole_TargetIsAdmin_ReturnsBadRequest()
    {
        var (controller, _, _, admin) = await CreateAsync();

        var result = await controller.UpdateUserRole(admin.Id, new UpdateUserRoleRequest { Role = "Buyer", District = "Kandy", BusinessName = "X" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserRole_SameRoleRequested_ReturnsBadRequest()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db);

        var result = await controller.UpdateUserRole(officer.Id, new UpdateUserRoleRequest { Role = "Officer", District = "Kandy" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserRole_UnknownUser_ReturnsNotFound()
    {
        var (controller, _, _, _) = await CreateAsync();

        var result = await controller.UpdateUserRole(123456, new UpdateUserRoleRequest { Role = "Buyer", District = "Kandy", BusinessName = "X" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserStatus_DeactivateOfficer_SucceedsAndRecordsAudit()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db);

        var result = await controller.UpdateUserStatus(officer.Id, new UpdateUserStatusRequest { IsActive = false });

        var summary = Assert.IsType<AdminUserSummary>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.False(summary.IsActive);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == officer.Id && a.Action == "UserDeactivated");
        Assert.NotNull(auditLog);
    }

    [Fact]
    public async Task UpdateUserStatus_TargetIsAdmin_ReturnsBadRequest()
    {
        var (controller, _, _, admin) = await CreateAsync();

        var result = await controller.UpdateUserStatus(admin.Id, new UpdateUserStatusRequest { IsActive = false });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateUserStatus_AlreadyInRequestedState_ReturnsBadRequest()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db);

        var result = await controller.UpdateUserStatus(officer.Id, new UpdateUserStatusRequest { IsActive = true });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetAuditLogs_ReturnsRecordedEntriesNewestFirst()
    {
        var (controller, db, users, _) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db);

        await controller.UpdateUserStatus(officer.Id, new UpdateUserStatusRequest { IsActive = false });
        await controller.UpdateUserStatus(officer.Id, new UpdateUserStatusRequest { IsActive = true });

        var result = await controller.GetAuditLogs(entityName: null, take: 10);

        // The controller returns Select(...)'s IEnumerable directly (same convention as
        // HarvestsController.GetAll), not a materialized List, so match that shape here.
        var logs = (Assert.IsType<OkObjectResult>(result.Result).Value as IEnumerable<AuditLogResponse>)?.ToList();
        Assert.NotNull(logs);
        Assert.True(logs!.Count >= 2);
        Assert.Equal("UserActivated", logs[0].Action);
        Assert.Equal("AgriLink Administrator", logs[0].UserName);
    }

    [Fact]
    public async Task Metrics_IssuesPending_MatchesTheSameDefinitionAsThePendingIssuesQueue()
    {
        var (controller, db, _, farmerUser) = await SeedIssueFixtureAsync();

        var result = await controller.Metrics();

        var metrics = Assert.IsType<AdminMetricsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, metrics.IssuesReported);
        Assert.Equal(1, metrics.IssuesPending);
        Assert.Equal(1, metrics.IssuesResolved);
    }

    private static async Task<(AdminController Controller, AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser Farmer)> SeedIssueFixtureAsync()
    {
        var (controller, db, users, _) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db);
        var farmerProfile = await db.FarmerProfiles.SingleAsync(f => f.UserId == farmer.Id);

        db.CropIssues.Add(new CropIssue
        {
            IssueId = 1,
            CropId = 1,
            FarmerProfileId = farmerProfile.FarmerProfileId,
            Crop = new Crop
            {
                CropId = 1,
                CropType = "Tomato",
                Field = new Field { FieldId = 1, Name = "Field 1", Farm = new Farm { FarmId = 1, Name = "Farm 1", District = "Galle", FarmerProfileId = farmerProfile.FarmerProfileId } },
            },
            Title = "Still pending",
            Description = "Awaiting officer review.",
            Status = IssueStatus.AwaitingReview,
            Advisories = { new AIAdvisory { AdvisoryId = 1, IssueId = 1, Status = AdvisoryStatus.Draft } },
        });
        db.CropIssues.Add(new CropIssue
        {
            IssueId = 2,
            CropId = 2,
            FarmerProfileId = farmerProfile.FarmerProfileId,
            Crop = new Crop
            {
                CropId = 2,
                CropType = "Rice",
                Field = new Field { FieldId = 2, Name = "Field 2", Farm = new Farm { FarmId = 2, Name = "Farm 2", District = "Galle", FarmerProfileId = farmerProfile.FarmerProfileId } },
            },
            Title = "Already resolved",
            Description = "Officer already approved this one.",
            Status = IssueStatus.Resolved,
            Advisories = { new AIAdvisory { AdvisoryId = 2, IssueId = 2, Status = AdvisoryStatus.Approved } },
        });
        await db.SaveChangesAsync();

        return (controller, db, users, farmer);
    }
}
