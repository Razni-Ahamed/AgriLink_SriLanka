using AgriLink.API.Data;
using AgriLink.API.DTOs.Accounts;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

public class UsersControllerSecurityTests
{
    private const string Password = "AgriLink@Test.2026!";

    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser User)> SeedFarmerAsync(
        string district = "Kandy", string nic = "199912345678", string phone = "0771234567")
    {
        var (db, users) = await UsersControllerTests.CreateAsync();
        var user = await UsersControllerTests.CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        db.FarmerProfiles.Add(new FarmerProfile
        {
            UserId = user.Id, NIC = nic, District = district, PhoneNumber = phone, FieldPlotNumber = "PLOT-1",
        });
        await db.SaveChangesAsync();
        return (db, users, user);
    }

    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser User)> SeedOfficerAsync()
    {
        var (db, users) = await UsersControllerTests.CreateAsync();
        var user = await UsersControllerTests.CreateUserAsync(users, "officer@agrilink.lk", "Officer One", "Officer");
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { UserId = user.Id, DepartmentId = 1, District = "Kandy" });
        await db.SaveChangesAsync();
        return (db, users, user);
    }

    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser User)> SeedAdminAsync()
    {
        var (db, users) = await UsersControllerTests.CreateAsync();
        var user = await UsersControllerTests.CreateUserAsync(users, "admin@agrilink.lk", "Admin One", "Admin");
        return (db, users, user);
    }

    // ---------- Re-auth ----------

    [Fact]
    public async Task VerifyPassword_WrongPassword_ReturnsBadRequestAndAuditsFailure()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.VerifyPassword(new VerifyPasswordRequest { CurrentPassword = "wrong" });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "SecurityReauthFailed" && a.UserId == user.Id);
    }

    [Fact]
    public async Task VerifyPassword_CorrectPassword_ReturnsNoContent()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.VerifyPassword(new VerifyPasswordRequest { CurrentPassword = Password });

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(await db.AuditLogs.Where(a => a.Action == "SecurityReauthFailed").ToListAsync());
    }

    [Fact]
    public async Task UpdatePhone_WrongPassword_ChangesNothingAndAudits()
    {
        var (db, users, user) = await SeedFarmerAsync(phone: "0771234567");
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.UpdatePhone(new UpdatePhoneRequest { CurrentPassword = "wrong", PhoneNumber = "0779999999" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("0771234567", (await db.FarmerProfiles.SingleAsync()).PhoneNumber);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "SecurityReauthFailed");
    }

    [Fact]
    public async Task CreateChangeRequest_WrongPassword_ChangesNothingAndAudits()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = "wrong", Field = "FullName", NewValue = "New Name",
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(db.ProfileChangeRequests);
        Assert.Contains(await db.AuditLogs.ToListAsync(), a => a.Action == "SecurityReauthFailed");
    }

    // ---------- GET /me/security ----------

    [Fact]
    public async Task Security_Farmer_ReturnsFarmerCapabilities()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.Security();

        var response = Assert.IsType<SecuritySettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(new[] { "password", "phone" }, response.CanChange);
        Assert.Equal(new[] { "fullName", "nic", "email" }, response.CanRequest);
        Assert.Equal("0771234567", response.PhoneNumber);
        Assert.Equal("199912345678", response.NIC);
    }

    [Fact]
    public async Task Security_Officer_HasNoNicInCanRequest()
    {
        var (db, users, user) = await SeedOfficerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Officer");

        var result = await controller.Security();

        var response = Assert.IsType<SecuritySettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(new[] { "fullName", "email" }, response.CanRequest);
        Assert.Null(response.NIC);
    }

    [Fact]
    public async Task Security_Admin_CanChangeFullNameAndEmailDirectlyWithNothingToRequest()
    {
        var (db, users, user) = await SeedAdminAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Admin");

        var result = await controller.Security();

        var response = Assert.IsType<SecuritySettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Contains("fullName", response.CanChange);
        Assert.Contains("email", response.CanChange);
        Assert.Empty(response.CanRequest);
    }

    [Fact]
    public async Task Security_ListsPendingFirstThenTenMostRecentDecided()
    {
        var (db, users, user) = await SeedFarmerAsync();

        db.ProfileChangeRequests.Add(new ProfileChangeRequest
        {
            UserId = user.Id, Field = ChangeRequestField.FullName, OldValue = "Farmer One", NewValue = "Farmer Two",
            Status = ChangeRequestStatus.Pending, RequestedAt = DateTime.UtcNow.AddDays(-1),
        });
        db.ProfileChangeRequests.Add(new ProfileChangeRequest
        {
            UserId = user.Id, Field = ChangeRequestField.Email, OldValue = "old@x.com", NewValue = "new@x.com",
            Status = ChangeRequestStatus.Rejected, RequestedAt = DateTime.UtcNow.AddDays(-5), DecidedAt = DateTime.UtcNow.AddDays(-4),
            RejectionReason = "Not valid",
        });
        await db.SaveChangesAsync();

        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");
        var result = await controller.Security();

        var response = Assert.IsType<SecuritySettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, response.ChangeRequests.Count);
        Assert.Equal("Pending", response.ChangeRequests[0].Status);
        Assert.Equal("Rejected", response.ChangeRequests[1].Status);
        Assert.Equal("Not valid", response.ChangeRequests[1].RejectionReason);
    }

    // ---------- PUT /me/phone: role matrix ----------

    [Fact]
    public async Task UpdatePhone_Farmer_EmptyValue_IsRejected()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.UpdatePhone(new UpdatePhoneRequest { CurrentPassword = Password, PhoneNumber = "" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdatePhone_Officer_EmptyValue_ClearsIt()
    {
        var (db, users, user) = await SeedOfficerAsync();
        user.PhoneNumber = "0771234567";
        await db.SaveChangesAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Officer");

        var result = await controller.UpdatePhone(new UpdatePhoneRequest { CurrentPassword = Password, PhoneNumber = "" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Null((await db.Users.SingleAsync(u => u.Id == user.Id)).PhoneNumber);
    }

    [Fact]
    public async Task UpdatePhone_InvalidFormat_ReturnsBadRequest()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.UpdatePhone(new UpdatePhoneRequest { CurrentPassword = Password, PhoneNumber = "12345" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ---------- POST /me/change-requests: role matrix + validation ----------

    [Fact]
    public async Task CreateChangeRequest_OfficerRequestsNic_ReturnsBadRequest()
    {
        var (db, users, user) = await SeedOfficerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Officer");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "NIC", NewValue = "199912345678",
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateChangeRequest_AdminRequestsNic_ReturnsBadRequest()
    {
        var (db, users, user) = await SeedAdminAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Admin");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "NIC", NewValue = "199912345678",
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateChangeRequest_SameAsCurrentValue_ReturnsBadRequest()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "Farmer One",
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateChangeRequest_Farmer_CreatesPendingRequestAndNotifiesOfficerAndAdmin()
    {
        var (db, users, user) = await SeedFarmerAsync(district: "Kandy");
        var officer = await UsersControllerTests.CreateUserAsync(users, "kandy.officer@agrilink.lk", "Kandy Officer", "Officer");
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.Add(new OfficerProfile { UserId = officer.Id, DepartmentId = 1, District = "Kandy" });
        var otherOfficer = await UsersControllerTests.CreateUserAsync(users, "galle.officer@agrilink.lk", "Galle Officer", "Officer");
        db.OfficerProfiles.Add(new OfficerProfile { UserId = otherOfficer.Id, DepartmentId = 1, District = "Galle" });
        var admin = await UsersControllerTests.CreateUserAsync(users, "admin@agrilink.lk", "Admin One", "Admin");
        await db.SaveChangesAsync();

        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "New Farmer Name",
        });

        Assert.IsType<ObjectResult>(result);
        var stored = await db.ProfileChangeRequests.SingleAsync();
        Assert.Equal(ChangeRequestStatus.Pending, stored.Status);
        Assert.Equal("Farmer One", stored.OldValue);
        Assert.Equal("New Farmer Name", stored.NewValue);
        // The old value stays in effect until approved.
        Assert.Equal("Farmer One", (await db.Users.SingleAsync(u => u.Id == user.Id)).FullName);

        var notifications = await db.Notifications.ToListAsync();
        Assert.Contains(notifications, n => n.UserId == officer.Id);
        Assert.DoesNotContain(notifications, n => n.UserId == otherOfficer.Id);
        Assert.Contains(notifications, n => n.UserId == admin.Id);
    }

    [Fact]
    public async Task CreateChangeRequest_SecondPendingRequestForSameField_ReturnsConflict()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");

        await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "First New Name",
        });
        var second = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "Second New Name",
        });

        Assert.IsType<ConflictObjectResult>(second);
        Assert.Single(db.ProfileChangeRequests);
    }

    [Fact]
    public async Task CreateChangeRequest_Admin_AppliesFullNameDirectly()
    {
        var (db, users, user) = await SeedAdminAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Admin");

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "New Admin Name",
        });

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal("New Admin Name", (await db.Users.SingleAsync()).FullName);
        Assert.Empty(db.ProfileChangeRequests);
    }

    [Fact]
    public async Task CreateChangeRequest_Admin_EmailChange_ReturnsFreshTokenAndRotatesStamp()
    {
        var (db, users, user) = await SeedAdminAsync();
        var stampBefore = user.SecurityStamp;
        var tokenService = Mock.Of<IJwtTokenService>(
            t => t.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()) == "fresh-admin-jwt");
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Admin", tokenService);

        var result = await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "Email", NewValue = "new-admin@agrilink.lk",
        });

        var response = Assert.IsType<AuthResponse>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.NotEmpty(response.Token);

        var refreshed = await db.Users.SingleAsync();
        Assert.Equal("new-admin@agrilink.lk", refreshed.Email);
        Assert.NotEqual(stampBefore, refreshed.SecurityStamp);
    }

    // ---------- Withdraw ----------

    [Fact]
    public async Task WithdrawChangeRequest_OwnPendingRequest_Succeeds()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");
        await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "New Name",
        });
        var requestId = (await db.ProfileChangeRequests.SingleAsync()).RequestId;

        var result = await controller.WithdrawChangeRequest(requestId);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(ChangeRequestStatus.Withdrawn, (await db.ProfileChangeRequests.SingleAsync()).Status);
    }

    [Fact]
    public async Task WithdrawChangeRequest_SomeoneElsesRequest_ReturnsNotFound()
    {
        var (db, users, user) = await SeedFarmerAsync();
        var controller = UsersControllerTests.BuildController(db, users, user.Id, "Farmer");
        await controller.CreateChangeRequest(new CreateChangeRequestRequest
        {
            CurrentPassword = Password, Field = "FullName", NewValue = "New Name",
        });
        var requestId = (await db.ProfileChangeRequests.SingleAsync()).RequestId;

        var otherUser = await UsersControllerTests.CreateUserAsync(users, "other@agrilink.lk", "Other", "Farmer");
        var otherController = UsersControllerTests.BuildController(db, users, otherUser.Id, "Farmer");

        var result = await otherController.WithdrawChangeRequest(requestId);

        Assert.IsType<NotFoundResult>(result);
        Assert.Equal(ChangeRequestStatus.Pending, (await db.ProfileChangeRequests.SingleAsync()).Status);
    }
}
