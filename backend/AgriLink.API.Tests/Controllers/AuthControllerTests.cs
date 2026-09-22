using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using System.Linq;

namespace AgriLink.API.Tests.Controllers;

public class AuthControllerTests
{
    private static RegisterRequest FarmerRequest(string email = "new.farmer@agrilink.lk", string district = "Kandy", string username = "new.farmer") => new()
    {
        FullName = "New Farmer",
        Email = email,
        Username = username,
        Password = "Farmer@AgriLink.2026!",
        NIC = "199912345678",
        District = district,
        Role = "Farmer",
        FieldPlotNumber = "PLOT-42",
        PhoneNumber = "0771234567",
    };

    private static RegisterRequest BuyerRequest(string email = "new.buyer@agrilink.lk", string district = "Kandy", string username = "new.buyer") => new()
    {
        FullName = "New Buyer",
        Email = email,
        Username = username,
        Password = "Buyer@AgriLink.2026!",
        NIC = "199912345678",
        District = district,
        Role = "Buyer",
        BusinessRegistrationNumber = "BRN-001",
        BusinessPhone = "0771234567",
        LegalBusinessName = "Test Traders Ltd",
    };

    private static async Task<(AuthController Controller, AgriLinkDbContext Db, Mock<INotificationService> Notifications)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);

        var tokenService = Mock.Of<IJwtTokenService>(
            t => t.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()) == "fake-jwt");
        var notifications = new Mock<INotificationService>();
        var controller = new AuthController(userManager, db, tokenService, notifications.Object);

        return (controller, db, notifications);
    }

    [Fact]
    public async Task Register_ValidFarmer_CreatesPendingInactiveAccount()
    {
        var (controller, db, _) = await CreateAsync();

        var result = await controller.Register(FarmerRequest());

        Assert.IsType<ObjectResult>(result.Result);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "new.farmer@agrilink.lk");
        Assert.NotNull(user);
        Assert.False(user!.IsActive);
        Assert.Equal(RegistrationStatus.Pending, user.RegistrationStatus);

        var profile = await db.FarmerProfiles.FirstOrDefaultAsync(f => f.UserId == user.Id);
        Assert.NotNull(profile);
        Assert.Equal("Kandy", profile!.District);
        Assert.Equal("PLOT-42", profile.FieldPlotNumber);
        Assert.Equal("0771234567", profile.PhoneNumber);
    }

    [Fact]
    public async Task Register_UnknownDistrict_ReturnsBadRequestAndCreatesNoAccount()
    {
        var (controller, db, _) = await CreateAsync();

        var request = FarmerRequest(district: "Notaplace");
        var result = await controller.Register(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Theory]
    [InlineData("kandy")]
    [InlineData("  Kandy  ")]
    public async Task Register_DistrictCaseAndWhitespaceInsensitive_Succeeds(string district)
    {
        var (controller, _, _) = await CreateAsync();

        var result = await controller.Register(FarmerRequest(district: district));

        Assert.IsType<ObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_FarmerMissingFieldPlotNumber_ReturnsBadRequest()
    {
        var (controller, db, _) = await CreateAsync();

        var request = FarmerRequest();
        request.FieldPlotNumber = null;

        var result = await controller.Register(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task Register_ValidBuyer_CreatesPendingInactiveAccountWithBusinessFields()
    {
        var (controller, db, _) = await CreateAsync();

        var result = await controller.Register(BuyerRequest());

        Assert.IsType<ObjectResult>(result.Result);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "new.buyer@agrilink.lk");
        Assert.NotNull(user);
        Assert.False(user!.IsActive);
        Assert.Equal(RegistrationStatus.Pending, user.RegistrationStatus);

        var profile = await db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == user.Id);
        Assert.NotNull(profile);
        Assert.Equal("Test Traders Ltd", profile!.BusinessName);
        Assert.Equal("BRN-001", profile.BusinessRegistrationNumber);
        Assert.Equal("0771234567", profile.BusinessPhone);
        Assert.Equal("Kandy", profile.District);
    }

    [Fact]
    public async Task Register_BuyerMissingBusinessFields_ReturnsBadRequest()
    {
        var (controller, db, _) = await CreateAsync();

        var request = BuyerRequest();
        request.BusinessRegistrationNumber = null;

        var result = await controller.Register(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task Register_UnknownRole_ReturnsBadRequest()
    {
        var (controller, db, _) = await CreateAsync();

        var request = FarmerRequest();
        request.Role = "Officer";

        var result = await controller.Register(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task Login_PendingAccount_FailsWithApprovalMessageNotGenericError()
    {
        var (controller, _, _) = await CreateAsync();
        await controller.Register(FarmerRequest());

        var result = await controller.Login(new LoginRequest { Email = "new.farmer@agrilink.lk", Password = "Farmer@AgriLink.2026!" });

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task Login_WrongPassword_StillReturnsGenericUnauthorized()
    {
        var (controller, _, _) = await CreateAsync();
        await controller.Register(FarmerRequest());

        var result = await controller.Login(new LoginRequest { Email = "new.farmer@agrilink.lk", Password = "WrongPassword123!" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ApprovedAccount_Succeeds()
    {
        var (controller, db, _) = await CreateAsync();
        await controller.Register(FarmerRequest());
        var user = await db.Users.FirstAsync(u => u.Email == "new.farmer@agrilink.lk");
        user.RegistrationStatus = RegistrationStatus.Approved;
        user.IsActive = true;
        await db.SaveChangesAsync();

        var result = await controller.Login(new LoginRequest { Email = "new.farmer@agrilink.lk", Password = "Farmer@AgriLink.2026!" });

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_RejectedAccount_FailsWithRejectionMessage()
    {
        var (controller, db, _) = await CreateAsync();
        await controller.Register(FarmerRequest());
        var user = await db.Users.FirstAsync(u => u.Email == "new.farmer@agrilink.lk");
        user.RegistrationStatus = RegistrationStatus.Rejected;
        user.RejectionReason = "NIC could not be verified.";
        await db.SaveChangesAsync();

        var result = await controller.Login(new LoginRequest { Email = "new.farmer@agrilink.lk", Password = "Farmer@AgriLink.2026!" });

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task Register_Farmer_NotifiesOfficersInSameDistrictOnly()
    {
        var (controller, db, notifications) = await CreateAsync();
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension Services" });
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = 100, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 2, UserId = 101, DepartmentId = 1, District = "Galle" });
        db.Users.AddRange(
            new ApplicationUser { Id = 100, UserName = "kandy.officer@test.com", Email = "kandy.officer@test.com", FullName = "Kandy Officer" },
            new ApplicationUser { Id = 101, UserName = "galle.officer@test.com", Email = "galle.officer@test.com", FullName = "Galle Officer" });
        await db.SaveChangesAsync();

        await controller.Register(FarmerRequest(district: "Kandy"));

        notifications.Verify(n => n.NotifyAsync(100, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        notifications.Verify(n => n.NotifyAsync(101, It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("200012345678", true)] // new 12-digit format
    [InlineData("901234567V", true)] // old format, uppercase suffix
    [InlineData("901234567x", true)] // old format, lowercase suffix
    [InlineData("90123456V", false)] // only 8 digits before the suffix
    [InlineData("1234567890", false)] // 10 digits, neither format
    [InlineData("20001234567A", false)] // 11 digits + a letter that isn't V/X
    public async Task Register_NicFormats_AcceptsOrRejectsAsExpected(string nic, bool shouldSucceed)
    {
        var (controller, db, _) = await CreateAsync();
        var request = FarmerRequest();
        request.NIC = nic;

        var result = await controller.Register(request);

        if (shouldSucceed)
        {
            Assert.IsType<ObjectResult>(result.Result);
        }
        else
        {
            Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Empty(db.Users);
        }
    }

    [Fact]
    public async Task Register_LowercaseNicSuffix_NormalizedToUppercaseBeforeSaving()
    {
        var (controller, db, _) = await CreateAsync();
        var request = FarmerRequest();
        request.NIC = "901234567x";

        await controller.Register(request);

        var profile = await db.FarmerProfiles.FirstAsync();
        Assert.Equal("901234567X", profile.NIC);
    }

    [Theory]
    [InlineData("0771234567", true)]
    [InlineData("077 123 4567", true)] // spaces stripped before validating
    [InlineData("077123456", false)] // 9 digits
    [InlineData("07712345678", false)] // 11 digits
    [InlineData("07712a4567", false)] // contains a letter
    public async Task Register_FarmerPhoneFormats_AcceptsOrRejectsAsExpected(string phone, bool shouldSucceed)
    {
        var (controller, db, _) = await CreateAsync();
        var request = FarmerRequest();
        request.PhoneNumber = phone;

        var result = await controller.Register(request);

        if (shouldSucceed)
        {
            Assert.IsType<ObjectResult>(result.Result);
        }
        else
        {
            Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Empty(db.Users);
        }
    }

    [Fact]
    public async Task Register_SpacedPhoneNumber_NormalizedToDigitsOnlyBeforeSaving()
    {
        var (controller, db, _) = await CreateAsync();
        var request = FarmerRequest();
        request.PhoneNumber = "077 123 4567";

        await controller.Register(request);

        var profile = await db.FarmerProfiles.FirstAsync();
        Assert.Equal("0771234567", profile.PhoneNumber);
    }

    [Theory]
    [InlineData("0771234567", true)]
    [InlineData("077-123-4567", true)] // dashes stripped before validating
    [InlineData("07712345", false)]
    public async Task Register_BuyerBusinessPhoneFormats_AcceptsOrRejectsAsExpected(string phone, bool shouldSucceed)
    {
        var (controller, db, _) = await CreateAsync();
        var request = BuyerRequest();
        request.BusinessPhone = phone;

        var result = await controller.Register(request);

        if (shouldSucceed)
        {
            Assert.IsType<ObjectResult>(result.Result);
        }
        else
        {
            Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Empty(db.Users);
        }
    }

    [Fact]
    public async Task Register_WeakPassword_ReturnsIdentityErrorsWithCodes()
    {
        var (controller, db, _) = await CreateAsync();
        var request = FarmerRequest();
        request.Password = "abc";

        var result = await controller.Register(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var errors = (badRequest.Value!.GetType().GetProperty("errors")!.GetValue(badRequest.Value) as IEnumerable<object>)!
            .ToList();
        Assert.NotEmpty(errors);

        var codes = errors.Select(e => (string)e.GetType().GetProperty("code")!.GetValue(e)!).ToList();
        var descriptions = errors.Select(e => (string)e.GetType().GetProperty("description")!.GetValue(e)!).ToList();
        Assert.Contains("PasswordTooShort", codes);
        Assert.NotEmpty(descriptions);
        Assert.Empty(db.Users);
    }

    [Theory]
    [InlineData("")] // required
    [InlineData("   ")]
    [InlineData("ab")]
    [InlineData("bad..name")]
    [InlineData("has space")]
    [InlineData("admin")] // reserved
    [InlineData("Support")] // reserved, whatever the case
    public async Task Register_MissingInvalidOrReservedUsername_ReturnsBadRequestAndCreatesNoAccount(string username)
    {
        var (controller, db, _) = await CreateAsync();

        var result = await controller.Register(FarmerRequest(username: username));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task Register_StoresTheUsernameTrimmedAndLowercased_WithTheChangeTimerUnset()
    {
        var (controller, db, _) = await CreateAsync();

        await controller.Register(FarmerRequest(username: "  Nimal.Perera "));

        var user = await db.Users.SingleAsync();
        Assert.Equal("nimal.perera", user.UserName);
        Assert.Equal("NIMAL.PERERA", user.NormalizedUserName);
        Assert.Null(user.UsernameChangedAt);
        // Login stays by email: the username must not replace it.
        Assert.Equal("new.farmer@agrilink.lk", user.Email);
    }

    [Theory]
    [InlineData("new.farmer")]
    [InlineData("NEW.Farmer")] // uniqueness is case-insensitive
    public async Task Register_UsernameAlreadyTaken_Returns409WithDuplicateUserNameCode(string secondUsername)
    {
        var (controller, db, _) = await CreateAsync();
        await controller.Register(FarmerRequest());

        var result = await controller.Register(BuyerRequest(username: secondUsername));

        var conflict = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Contains("DuplicateUserName", ResponseBodyHelpers.ErrorCodes(conflict.Value));
        Assert.Single(db.Users);
    }

    [Fact]
    public async Task Register_UsernameTakenByAnotherRole_IsStillAConflict()
    {
        var (controller, db, _) = await CreateAsync();
        db.Users.Add(new ApplicationUser
        {
            UserName = "kandy.officer",
            NormalizedUserName = "KANDY.OFFICER",
            Email = "officer@agrilink.lk",
            FullName = "Kandy Officer",
        });
        await db.SaveChangesAsync();

        var result = await controller.Register(FarmerRequest(username: "kandy.officer"));

        Assert.IsType<ConflictObjectResult>(result.Result);
    }
}
