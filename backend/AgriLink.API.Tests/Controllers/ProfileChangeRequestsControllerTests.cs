using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Accounts;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class ProfileChangeRequestsControllerTests
{
    private const string Password = "AgriLink@Test.2026!";

    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);
        return (db, userManager);
    }

    private static ProfileChangeRequestsController BuildController(
        AgriLinkDbContext db, UserManager<ApplicationUser> users, int actingUserId, string role) => new(
            users, db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role) },
            },
        };

    private static async Task<ApplicationUser> CreateFarmerAsync(
        UserManager<ApplicationUser> users, AgriLinkDbContext db, string district, string fullName = "Farmer One")
    {
        var user = new ApplicationUser { UserName = $"{fullName.Replace(" ", ".")}@agrilink.lk", Email = $"{fullName.Replace(" ", ".")}@agrilink.lk", FullName = fullName };
        await users.CreateAsync(user, Password);
        await users.AddToRoleAsync(user, "Farmer");
        db.FarmerProfiles.Add(new FarmerProfile { UserId = user.Id, NIC = "199912345678", District = district, PhoneNumber = "0771234567" });
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<ApplicationUser> CreateOfficerAsync(UserManager<ApplicationUser> users, AgriLinkDbContext db, string district)
    {
        var user = new ApplicationUser { UserName = $"officer.{district}@agrilink.lk", Email = $"officer.{district}@agrilink.lk", FullName = $"{district} Officer" };
        await users.CreateAsync(user, Password);
        await users.AddToRoleAsync(user, "Officer");

        var department = await db.Departments.FirstOrDefaultAsync();
        if (department is null)
        {
            department = new Department { Name = "Extension" };
            db.Departments.Add(department);
            await db.SaveChangesAsync();
        }

        db.OfficerProfiles.Add(new OfficerProfile { UserId = user.Id, DepartmentId = department.DepartmentId, District = district });
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<ApplicationUser> CreateBuyerAsync(UserManager<ApplicationUser> users, AgriLinkDbContext db, string district = "Kandy")
    {
        var user = new ApplicationUser { UserName = "buyer@agrilink.lk", Email = "buyer@agrilink.lk", FullName = "Buyer One" };
        await users.CreateAsync(user, Password);
        await users.AddToRoleAsync(user, "Buyer");
        db.BuyerProfiles.Add(new BuyerProfile { UserId = user.Id, BusinessName = "Buyer Co", District = district, NIC = "199912345678" });
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<ApplicationUser> CreateAdminAsync(UserManager<ApplicationUser> users)
    {
        var user = new ApplicationUser { UserName = "admin@agrilink.lk", Email = "admin@agrilink.lk", FullName = "Admin One" };
        await users.CreateAsync(user, Password);
        await users.AddToRoleAsync(user, "Admin");
        return user;
    }

    private static ProfileChangeRequest PendingFullNameRequest(ApplicationUser user, string newName = "New Name") => new()
    {
        UserId = user.Id, Field = ChangeRequestField.FullName, OldValue = user.FullName, NewValue = newName,
        Status = ChangeRequestStatus.Pending,
    };

    // ---------- Pending list scoping ----------

    [Fact]
    public async Task Pending_Officer_OnlySeesFarmerRequestsInOwnDistrict()
    {
        var (db, users) = await CreateAsync();
        var kandyFarmer = await CreateFarmerAsync(users, db, "Kandy", "Kandy Farmer");
        var galleFarmer = await CreateFarmerAsync(users, db, "Galle", "Galle Farmer");
        var kandyOfficer = await CreateOfficerAsync(users, db, "Kandy");
        db.ProfileChangeRequests.Add(PendingFullNameRequest(kandyFarmer));
        db.ProfileChangeRequests.Add(PendingFullNameRequest(galleFarmer));
        await db.SaveChangesAsync();

        var controller = BuildController(db, users, kandyOfficer.Id, "Officer");
        var result = await controller.Pending(page: 1, pageSize: 20);

        var page = Assert.IsType<PagedResponse<PendingChangeRequestResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        var item = Assert.Single(page.Items);
        Assert.Equal("Kandy Farmer", item.FullName);
    }

    [Fact]
    public async Task Pending_Officer_NeverSeesBuyerOrOfficerRequests()
    {
        var (db, users) = await CreateAsync();
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var buyer = await CreateBuyerAsync(users, db, "Kandy");
        db.ProfileChangeRequests.Add(PendingFullNameRequest(buyer));
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer").Pending(page: 1, pageSize: 20);

        var page = Assert.IsType<PagedResponse<PendingChangeRequestResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task Pending_Admin_SeesEveryRole()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var buyer = await CreateBuyerAsync(users, db, "Galle");
        var admin = await CreateAdminAsync(users);
        db.ProfileChangeRequests.Add(PendingFullNameRequest(farmer));
        db.ProfileChangeRequests.Add(PendingFullNameRequest(buyer));
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, admin.Id, "Admin").Pending(page: 1, pageSize: 20);

        var page = Assert.IsType<PagedResponse<PendingChangeRequestResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, page.TotalCount);
    }

    // ---------- Approve: authorization ----------

    [Fact]
    public async Task Approve_OfficerFromAnotherDistrict_ReturnsForbidden()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var galleOfficer = await CreateOfficerAsync(users, db, "Galle");
        var request = PendingFullNameRequest(farmer);
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, galleOfficer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Approve_OfficerOnBuyerRequest_ReturnsForbidden()
    {
        var (db, users) = await CreateAsync();
        var buyer = await CreateBuyerAsync(users, db);
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = PendingFullNameRequest(buyer);
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Approve_OwnRequest_ReturnsForbidden()
    {
        var (db, users) = await CreateAsync();
        var admin = await CreateAdminAsync(users);
        var request = PendingFullNameRequest(admin);
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, admin.Id, "Admin")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Approve_AlreadyDecidedRequest_ReturnsBadRequest()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = PendingFullNameRequest(farmer);
        request.Status = ChangeRequestStatus.Approved;
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Approve_WrongPassword_ReturnsBadRequestAndAudits()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = PendingFullNameRequest(farmer);
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = "wrong" });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "SecurityReauthFailed");
        Assert.Equal(ChangeRequestStatus.Pending, (await db.ProfileChangeRequests.SingleAsync()).Status);
    }

    [Fact]
    public async Task Approve_EmailTakenSinceRequestWasMade_ReturnsConflictAndLeavesRequestPending()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var takenEmail = "taken@agrilink.lk";
        var someoneElse = new ApplicationUser { UserName = takenEmail, Email = takenEmail, FullName = "Someone Else" };
        await users.CreateAsync(someoneElse, Password);

        var request = new ProfileChangeRequest
        {
            UserId = farmer.Id, Field = ChangeRequestField.Email, OldValue = farmer.Email!, NewValue = takenEmail,
            Status = ChangeRequestStatus.Pending,
        };
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(ChangeRequestStatus.Pending, (await db.ProfileChangeRequests.SingleAsync(r => r.RequestId == request.RequestId)).Status);
    }

    // ---------- Approve: apply + audit + notify ----------

    [Fact]
    public async Task Approve_FullNameRequest_UpdatesUserAndNotifiesRequester()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = PendingFullNameRequest(farmer, "Approved New Name");
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("Approved New Name", (await db.Users.SingleAsync(u => u.Id == farmer.Id)).FullName);
        var updated = await db.ProfileChangeRequests.SingleAsync();
        Assert.Equal(ChangeRequestStatus.Approved, updated.Status);
        Assert.Equal(officer.Id, updated.DecidedByUserId);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == farmer.Id);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "ProfileChangeApproved");
    }

    [Fact]
    public async Task Approve_NicRequest_UpdatesFarmerProfile()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = new ProfileChangeRequest
        {
            UserId = farmer.Id, Field = ChangeRequestField.NIC, OldValue = "199912345678", NewValue = "200011223344",
            Status = ChangeRequestStatus.Pending,
        };
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.Equal("200011223344", (await db.FarmerProfiles.SingleAsync()).NIC);
    }

    [Fact]
    public async Task Approve_EmailRequest_RotatesSecurityStampSoOldTokenBecomesInvalid()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var stampBefore = farmer.SecurityStamp;
        var request = new ProfileChangeRequest
        {
            UserId = farmer.Id, Field = ChangeRequestField.Email, OldValue = farmer.Email!, NewValue = "new-farmer@agrilink.lk",
            Status = ChangeRequestStatus.Pending,
        };
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        await BuildController(db, users, officer.Id, "Officer")
            .Approve(request.RequestId, new VerifyPasswordRequest { CurrentPassword = Password });

        var refreshed = await db.Users.SingleAsync(u => u.Id == farmer.Id);
        Assert.Equal("new-farmer@agrilink.lk", refreshed.Email);
        Assert.NotEqual(stampBefore, refreshed.SecurityStamp);

        var validator = new AccountSessionValidator(db);
        Assert.False(await validator.IsValidAsync(farmer.Id, stampBefore, CancellationToken.None));
    }

    // ---------- Reject ----------

    [Fact]
    public async Task Reject_RequiresReason_AndNotifiesRequesterWithIt()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateFarmerAsync(users, db, "Kandy");
        var officer = await CreateOfficerAsync(users, db, "Kandy");
        var request = PendingFullNameRequest(farmer);
        db.ProfileChangeRequests.Add(request);
        await db.SaveChangesAsync();

        var result = await BuildController(db, users, officer.Id, "Officer")
            .Reject(request.RequestId, new RejectChangeRequestRequest { Reason = "Name does not match NIC records." });

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.ProfileChangeRequests.SingleAsync();
        Assert.Equal(ChangeRequestStatus.Rejected, updated.Status);
        Assert.Equal("Name does not match NIC records.", updated.RejectionReason);
        Assert.Contains(await db.Notifications.ToListAsync(), n => n.UserId == farmer.Id && n.Message.Contains("Name does not match NIC records."));
        // The old value stays in effect — a rejection never touches it.
        Assert.Equal("Farmer One", (await db.Users.SingleAsync(u => u.Id == farmer.Id)).FullName);
    }
}
