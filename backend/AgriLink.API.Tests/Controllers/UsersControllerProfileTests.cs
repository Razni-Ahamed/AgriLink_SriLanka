using System.Text.Json;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Models;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static AgriLink.API.Tests.Controllers.UsersControllerTests;

namespace AgriLink.API.Tests.Controllers;

/// <summary>GET /api/users/me's new fields for each role, and PUT /api/users/me/profile.</summary>
public class UsersControllerProfileTests
{
    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser Farmer)> CreateFarmerAsync()
    {
        var (db, users) = await CreateAsync();
        var farmer = await CreateUserAsync(users, "nimal.perera", "Nimal Perera", "Farmer");
        farmer.Email = "nimal@agrilink.lk";
        db.FarmerProfiles.Add(new FarmerProfile
        {
            UserId = farmer.Id,
            NIC = "199912345678",
            District = "Kandy",
            FieldPlotNumber = "PLOT-42",
            PhoneNumber = "0771234567",
        });
        await db.SaveChangesAsync();
        return (db, users, farmer);
    }

    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users, ApplicationUser Buyer)> CreateBuyerAsync()
    {
        var (db, users) = await CreateAsync();
        var buyer = await CreateUserAsync(users, "kumari.silva", "Kumari Silva", "Buyer");
        db.BuyerProfiles.Add(new BuyerProfile
        {
            UserId = buyer.Id,
            BusinessName = "Silva Traders",
            BusinessRegistrationNumber = "BRN-001",
            BusinessPhone = "0112345678",
            NIC = "901234567V",
            District = "Colombo",
        });
        await db.SaveChangesAsync();
        return (db, users, buyer);
    }

    private static UserProfileResponse Ok(ActionResult<UserProfileResponse> result) =>
        Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static Task<ApplicationUser> ReloadAsync(AgriLinkDbContext db, int userId) =>
        db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);

    // ----- GET /me -----

    [Fact]
    public async Task Me_Farmer_ReturnsTheNewProfileFields()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        farmer.DisplayName = "Nimal";
        farmer.ProfilePhotoUrl = "https://res.cloudinary.com/demo/image/upload/a.jpg";
        await db.SaveChangesAsync();

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer").Me());

        Assert.Equal("nimal.perera", profile.Username);
        Assert.Equal("Nimal", profile.DisplayName);
        Assert.Equal("https://res.cloudinary.com/demo/image/upload/a.jpg", profile.ProfilePhotoUrl);
        Assert.Equal("0771234567", profile.PhoneNumber);
        Assert.Equal("PLOT-42", profile.FieldPlotNumber);
        Assert.Equal("199912345678", profile.NIC);
        Assert.Null(profile.BusinessName);
        Assert.Null(profile.DepartmentName);
        Assert.Null(profile.UsernameChangeAvailableAt);
        Assert.Equal(farmer.CreatedAt, profile.CreatedAt);
    }

    [Fact]
    public async Task Me_Buyer_ReturnsBusinessDetailsNicAndBusinessPhone()
    {
        var (db, users, buyer) = await CreateBuyerAsync();

        var profile = Ok(await BuildController(db, users, buyer.Id, "Buyer").Me());

        Assert.Equal("kumari.silva", profile.Username);
        Assert.Equal("Silva Traders", profile.BusinessName);
        Assert.Equal("BRN-001", profile.BusinessRegistrationNumber);
        Assert.Equal("0112345678", profile.PhoneNumber);
        Assert.Equal("901234567V", profile.NIC);
        Assert.Null(profile.FieldPlotNumber);
    }

    [Fact]
    public async Task Me_Officer_ReturnsDepartmentAndIdentityPhone()
    {
        var (db, users) = await CreateAsync();
        var officer = await CreateUserAsync(users, "kandy.officer", "Kandy Officer", "Officer");
        officer.PhoneNumber = "0812345678";
        await db.SaveChangesAsync();
        OfficerTestSeeding.EnsureOfficerProfile(db, officer.Id, "Kandy");

        var profile = Ok(await BuildController(db, users, officer.Id, "Officer").Me());

        Assert.Equal("Extension", profile.DepartmentName);
        Assert.Equal("Kandy", profile.District);
        Assert.Equal("0812345678", profile.PhoneNumber);
        Assert.Null(profile.NIC);
    }

    [Fact]
    public async Task Me_Admin_ReturnsIdentityPhone()
    {
        var (db, users) = await CreateAsync();
        var admin = await CreateUserAsync(users, "site.admin", "Site Admin", "Admin");
        admin.PhoneNumber = "0111111111";
        await db.SaveChangesAsync();

        var profile = Ok(await BuildController(db, users, admin.Id, "Admin").Me());

        Assert.Equal("Admin", profile.Role);
        Assert.Equal("0111111111", profile.PhoneNumber);
        Assert.Null(profile.District);
    }

    [Fact]
    public async Task Me_AfterARecentUsernameChange_SaysWhenTheNextOneIsAllowed()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var changedAt = DateTime.UtcNow.AddDays(-10);
        farmer.UsernameChangedAt = changedAt;
        await db.SaveChangesAsync();

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer").Me());

        Assert.Equal(changedAt.AddDays(30), profile.UsernameChangeAvailableAt);
    }

    // ----- PUT /me/profile -----

    [Fact]
    public async Task UpdateProfile_NullFields_KeepTheirValues()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        farmer.DisplayName = "Nimal";
        await db.SaveChangesAsync();

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer").UpdateProfile(new UpdateProfileRequest()));

        Assert.Equal("Nimal", profile.DisplayName);
        Assert.Equal("nimal.perera", profile.Username);
        Assert.Equal("PLOT-42", profile.FieldPlotNumber);
        Assert.Empty(db.AuditLogs); // nothing changed, so nothing to audit
    }

    [Fact]
    public async Task UpdateProfile_EmptyDisplayName_ClearsIt()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        farmer.DisplayName = "Nimal";
        await db.SaveChangesAsync();

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { DisplayName = "  " }));

        Assert.Null(profile.DisplayName);
        Assert.Null((await ReloadAsync(db, farmer.Id)).DisplayName);
    }

    [Fact]
    public async Task UpdateProfile_ChangesEveryEditableField_TrimmedInOneSave_AndAudits()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var stampBefore = farmer.SecurityStamp;

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer").UpdateProfile(new UpdateProfileRequest
        {
            DisplayName = "  Nimal P.  ",
            Username = " Nimal_P ",
            FieldPlotNumber = " PLOT-7 ",
        }));

        Assert.Equal("Nimal P.", profile.DisplayName);
        Assert.Equal("nimal_p", profile.Username);
        Assert.Equal("PLOT-7", profile.FieldPlotNumber);

        var saved = await ReloadAsync(db, farmer.Id);
        Assert.Equal("NIMAL_P", saved.NormalizedUserName);
        // A rename must not sign the user out.
        Assert.Equal(stampBefore, saved.SecurityStamp);
        Assert.Equal("PLOT-7", (await db.FarmerProfiles.AsNoTracking().SingleAsync()).FieldPlotNumber);

        var audit = await db.AuditLogs.SingleAsync(a => a.Action == "ProfileUpdated");
        Assert.Equal(farmer.Id, audit.UserId);
        Assert.Equal(farmer.Id, audit.EntityId);
        var oldValues = JsonSerializer.Deserialize<Dictionary<string, string?>>(audit.OldValue!)!;
        var newValues = JsonSerializer.Deserialize<Dictionary<string, string?>>(audit.NewValue!)!;
        Assert.Equal(new[] { "displayName", "fieldPlotNumber", "username" }, newValues.Keys.Order());
        Assert.Null(oldValues["displayName"]);
        Assert.Equal("nimal.perera", oldValues["username"]);
        Assert.Equal("nimal_p", newValues["username"]);
        Assert.Equal("PLOT-42", oldValues["fieldPlotNumber"]);
        Assert.Equal("PLOT-7", newValues["fieldPlotNumber"]);
    }

    [Fact]
    public async Task UpdateProfile_BuyerBusinessName_IsUpdated()
    {
        var (db, users, buyer) = await CreateBuyerAsync();

        var profile = Ok(await BuildController(db, users, buyer.Id, "Buyer")
            .UpdateProfile(new UpdateProfileRequest { BusinessName = "Silva & Sons" }));

        Assert.Equal("Silva & Sons", profile.BusinessName);
        Assert.Equal("Silva & Sons", (await db.BuyerProfiles.AsNoTracking().SingleAsync()).BusinessName);
    }

    [Fact]
    public async Task UpdateProfile_FieldPlotNumberFromABuyer_Is400()
    {
        var (db, users, buyer) = await CreateBuyerAsync();

        var result = await BuildController(db, users, buyer.Id, "Buyer")
            .UpdateProfile(new UpdateProfileRequest { FieldPlotNumber = "PLOT-1" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProfile_BusinessNameFromAFarmer_Is400_AndChangesNothingElse()
    {
        var (db, users, farmer) = await CreateFarmerAsync();

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { DisplayName = "Nimal", BusinessName = "Perera Farms" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Null((await ReloadAsync(db, farmer.Id)).DisplayName);
        Assert.Empty(db.AuditLogs);
    }

    [Theory]
    [InlineData("Officer")]
    [InlineData("Admin")]
    public async Task UpdateProfile_RoleFieldsFromOfficerOrAdmin_Are400(string role)
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "staff.member", "Staff Member", role);
        var controller = BuildController(db, users, user.Id, role);

        Assert.IsType<BadRequestObjectResult>((await controller.UpdateProfile(new UpdateProfileRequest { FieldPlotNumber = "P" })).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateProfile(new UpdateProfileRequest { BusinessName = "B" })).Result);
        Ok(await controller.UpdateProfile(new UpdateProfileRequest { DisplayName = "Staff" }));
    }

    [Fact]
    public async Task UpdateProfile_UsernameTakenByAnotherAccount_Is409()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        await CreateUserAsync(users, "kumari.silva", "Kumari Silva", "Buyer");

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { Username = "Kumari.Silva" });

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Contains("DuplicateUserName", ResponseBodyHelpers.ErrorCodes(conflict.Value));
        Assert.Equal("nimal.perera", (await ReloadAsync(db, farmer.Id)).UserName);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("no..dots")]
    [InlineData("admin")]
    [InlineData("has space")]
    public async Task UpdateProfile_InvalidOrReservedUsername_Is400(string username)
    {
        var (db, users, farmer) = await CreateFarmerAsync();

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { Username = username });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Null((await ReloadAsync(db, farmer.Id)).UsernameChangedAt);
    }

    [Fact]
    public async Task UpdateProfile_FirstUsernameChangeIsFree_AndStartsTheTimer()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var before = DateTime.UtcNow;

        var profile = Ok(await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { Username = "nimal.p" }));

        var changedAt = (await ReloadAsync(db, farmer.Id)).UsernameChangedAt;
        Assert.NotNull(changedAt);
        Assert.InRange(changedAt!.Value, before, DateTime.UtcNow);
        Assert.Equal(changedAt.Value.AddDays(30), profile.UsernameChangeAvailableAt);
    }

    [Fact]
    public async Task UpdateProfile_SecondUsernameChangeWithin30Days_Is400WithTheNextAllowedDate()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var controller = BuildController(db, users, farmer.Id, "Farmer");
        Ok(await controller.UpdateProfile(new UpdateProfileRequest { Username = "nimal.p" }));

        var result = await controller.UpdateProfile(new UpdateProfileRequest { Username = "nimal.q" });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var nextAllowed = Assert.IsType<DateTime>(ResponseBodyHelpers.Property(badRequest.Value, "nextChangeAllowedAt"));
        Assert.True(nextAllowed > DateTime.UtcNow.AddDays(29));
        Assert.Equal("nimal.p", (await ReloadAsync(db, farmer.Id)).UserName);
    }

    [Fact]
    public async Task UpdateProfile_UsernameChangeAfter30Days_IsAllowedAgain()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        farmer.UsernameChangedAt = DateTime.UtcNow.AddDays(-31);
        await db.SaveChangesAsync();

        Ok(await BuildController(db, users, farmer.Id, "Farmer").UpdateProfile(new UpdateProfileRequest { Username = "nimal.q" }));

        Assert.Equal("nimal.q", (await ReloadAsync(db, farmer.Id)).UserName);
    }

    [Fact]
    public async Task UpdateProfile_SendingTheCurrentUsername_IsNotAChange_AndDoesNotStartTheTimer()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        farmer.UsernameChangedAt = DateTime.UtcNow.AddDays(-2);
        await db.SaveChangesAsync();

        // Allowed even inside the 30 days, because nothing is changing.
        Ok(await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { Username = "NIMAL.PERERA", DisplayName = "Nimal" }));

        var saved = await ReloadAsync(db, farmer.Id);
        Assert.Equal("nimal.perera", saved.UserName);
        Assert.Equal("Nimal", saved.DisplayName);
        Assert.True(saved.UsernameChangedAt < DateTime.UtcNow.AddDays(-1));
    }

    [Theory]
    [InlineData(61)]
    [InlineData(200)]
    public async Task UpdateProfile_DisplayNameLongerThanTheColumn_Is400(int length)
    {
        var (db, users, farmer) = await CreateFarmerAsync();

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { DisplayName = new string('a', length) });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProfile_DisplayNameWithControlCharacters_Is400()
    {
        var (db, users, farmer) = await CreateFarmerAsync();

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { DisplayName = "Nimal\nAdmin" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProfile_FieldPlotNumberLongerThanTheColumn_Is400()
    {
        var (db, users, farmer) = await CreateFarmerAsync();

        var result = await BuildController(db, users, farmer.Id, "Farmer")
            .UpdateProfile(new UpdateProfileRequest { FieldPlotNumber = new string('P', 51) });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateProfile_UnknownJsonFields_AreIgnored_NoMassAssignment()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var otherUser = await CreateUserAsync(users, "someone.else", "Someone Else", "Buyer");
        // Everything but displayName is something this endpoint must never let a caller set.
        const string json = """
            {
              "displayName": "Nimal",
              "userId": 999,
              "id": 999,
              "fullName": "Hacked Name",
              "email": "attacker@evil.test",
              "isActive": false,
              "registrationStatus": "Rejected",
              "role": "Admin",
              "securityStamp": "x",
              "passwordHash": "x",
              "phoneNumber": "0000000000",
              "profilePhotoUrl": "javascript:alert(1)",
              "profilePhotoKey": "../../etc/passwd",
              "usernameChangedAt": "2000-01-01T00:00:00Z",
              "nic": "000000000V",
              "district": "Jaffna"
            }
            """;
        var request = JsonSerializer.Deserialize<UpdateProfileRequest>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;

        Ok(await BuildController(db, users, farmer.Id, "Farmer").UpdateProfile(request));

        var saved = await ReloadAsync(db, farmer.Id);
        Assert.Equal("Nimal", saved.DisplayName);
        Assert.Equal("Nimal Perera", saved.FullName);
        Assert.Equal("nimal@agrilink.lk", saved.Email);
        Assert.True(saved.IsActive);
        Assert.Equal(RegistrationStatus.Approved, saved.RegistrationStatus);
        Assert.Null(saved.PhoneNumber);
        Assert.Null(saved.ProfilePhotoUrl);
        Assert.Null(saved.ProfilePhotoKey);
        Assert.Null(saved.UsernameChangedAt);
        Assert.Equal(farmer.SecurityStamp, saved.SecurityStamp);
        Assert.Equal(new[] { "Farmer" }, await users.GetRolesAsync(saved));
        var farmerProfile = await db.FarmerProfiles.AsNoTracking().SingleAsync();
        Assert.Equal("199912345678", farmerProfile.NIC);
        Assert.Equal("Kandy", farmerProfile.District);
        Assert.Equal("Someone Else", (await ReloadAsync(db, otherUser.Id)).FullName);
    }

    [Fact]
    public void UpdateProfileRequest_ExposesOnlyTheFourEditableFields()
    {
        // A guard for the future: adding a property here makes it settable by every user.
        var properties = typeof(UpdateProfileRequest).GetProperties().Select(p => p.Name).Order();

        Assert.Equal(new[] { "BusinessName", "DisplayName", "FieldPlotNumber", "Username" }, properties);
    }

    [Fact]
    public async Task UpdateProfile_AlwaysActsOnTheCallerFromTheToken()
    {
        var (db, users, farmer) = await CreateFarmerAsync();
        var other = await CreateUserAsync(users, "kumari.silva", "Kumari Silva", "Farmer");

        Ok(await BuildController(db, users, farmer.Id, "Farmer").UpdateProfile(new UpdateProfileRequest { DisplayName = "Mine" }));

        Assert.Equal("Mine", (await ReloadAsync(db, farmer.Id)).DisplayName);
        Assert.Null((await ReloadAsync(db, other.Id)).DisplayName);
    }
}
