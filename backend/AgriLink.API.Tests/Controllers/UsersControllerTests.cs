using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Images;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Controllers;

public class UsersControllerTests
{
    internal static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);
        return (db, userManager);
    }

    internal static UsersController BuildController(
        AgriLinkDbContext db,
        UserManager<ApplicationUser> users,
        int actingUserId,
        string role,
        IJwtTokenService? tokenService = null,
        IProfilePhotoStorage? photoStorage = null,
        INotificationService? notifications = null) => new(
            users,
            db,
            new CurrentUserService(db),
            new AuditLogService(db),
            notifications ?? new NotificationService(db),
            tokenService ?? Mock.Of<IJwtTokenService>(),
            new ProfilePhotoProcessor(),
            photoStorage ?? Mock.Of<IProfilePhotoStorage>(),
            NullLogger<UsersController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    internal static async Task<ApplicationUser> CreateUserAsync(
        UserManager<ApplicationUser> users,
        string email,
        string fullName,
        string role)
    {
        var user = new ApplicationUser { UserName = email, Email = email, FullName = fullName };
        var created = await users.CreateAsync(user, "AgriLink@Test.2026!");
        Assert.True(created.Succeeded);
        Assert.True((await users.AddToRoleAsync(user, role)).Succeeded);
        return user;
    }

    [Fact]
    public async Task Me_Farmer_ReturnsFarmerProfileIdWithProfileDetails()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");

        db.FarmerProfiles.Add(new FarmerProfile
        {
            UserId = user.Id,
            NIC = "199912345678",
            District = "Kandy",
        });
        await db.SaveChangesAsync();
        var expectedProfileId = await db.FarmerProfiles
            .Where(f => f.UserId == user.Id)
            .Select(f => f.FarmerProfileId)
            .SingleAsync();

        var controller = BuildController(db, users, user.Id, "Farmer");

        var result = await controller.Me();

        var response = Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Farmer", response.Role);
        Assert.Equal("199912345678", response.NIC);
        Assert.Equal("Kandy", response.District);
        // The client compares this against HarvestListingResponse.FarmerProfileId to decide
        // whether to offer the self-service "Edit Listing" action on a listing.
        Assert.Equal(expectedProfileId, response.FarmerProfileId);
    }

    [Fact]
    public async Task Me_Buyer_ReturnsNoFarmerProfileId()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "buyer@agrilink.lk", "Buyer One", "Buyer");

        db.BuyerProfiles.Add(new BuyerProfile
        {
            UserId = user.Id,
            BusinessName = "Colombo Produce",
            District = "Colombo",
        });
        await db.SaveChangesAsync();

        var controller = BuildController(db, users, user.Id, "Buyer");

        var result = await controller.Me();

        var response = Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Buyer", response.Role);
        Assert.Equal("Colombo", response.District);
        Assert.Null(response.FarmerProfileId);
    }

    [Fact]
    public async Task Me_FarmerWithoutProfileRow_ReturnsNullFarmerProfileId()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "orphan@agrilink.lk", "No Profile", "Farmer");

        var controller = BuildController(db, users, user.Id, "Farmer");

        var result = await controller.Me();

        var response = Assert.IsType<UserProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Null(response.FarmerProfileId);
        Assert.Null(response.District);
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_SucceedsAndReturnsFreshToken()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var tokenService = Mock.Of<IJwtTokenService>(
            t => t.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()) == "fresh-jwt");
        var controller = BuildController(db, users, user.Id, "Farmer", tokenService);

        var result = await controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "AgriLink@Test.2026!",
            NewPassword = "NewPassword@2026!",
        });

        var response = Assert.IsType<AuthResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("fresh-jwt", response.Token);
        Assert.Equal("Farmer", response.Role);

        // The new password must actually work, and the old one must no longer.
        Assert.True(await users.CheckPasswordAsync(user, "NewPassword@2026!"));
        Assert.False(await users.CheckPasswordAsync(user, "AgriLink@Test.2026!"));

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == user.Id && a.Action == "PasswordChanged");
        Assert.NotNull(auditLog);
        Assert.Equal("User", auditLog!.EntityName);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequestAndLeavesPasswordUnchanged()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer");

        var result = await controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "TotallyWrong@2026!",
            NewPassword = "NewPassword@2026!",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.True(await users.CheckPasswordAsync(user, "AgriLink@Test.2026!"));
        Assert.Empty(await db.AuditLogs.Where(a => a.Action == "PasswordChanged").ToListAsync());
    }

    [Fact]
    public async Task ChangePassword_NewPasswordFailsIdentityPolicy_ReturnsBadRequest()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "farmer@agrilink.lk", "Farmer One", "Farmer");
        var controller = BuildController(db, users, user.Id, "Farmer");

        var result = await controller.ChangePassword(new ChangePasswordRequest
        {
            CurrentPassword = "AgriLink@Test.2026!",
            NewPassword = "short",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private static async Task<UsernameAvailabilityResponse> CheckAvailabilityAsync(UsersController controller, string? username)
    {
        var result = await controller.UsernameAvailable(username);
        return Assert.IsType<UsernameAvailabilityResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
    }

    [Fact]
    public async Task UsernameAvailable_ReportsAllFourOutcomes_ToAnAnonymousCaller()
    {
        var (db, users) = await CreateAsync();
        await CreateUserAsync(users, "nimal.perera", "Nimal Perera", "Farmer");
        var controller = BuildController(db, users, actingUserId: 0, role: "Farmer");
        // No token: the registration form calls this before an account exists.
        controller.ControllerContext.HttpContext = new DefaultHttpContext();

        var free = await CheckAvailabilityAsync(controller, "kumari.silva");
        Assert.True(free.Available);
        Assert.Null(free.Reason);

        var taken = await CheckAvailabilityAsync(controller, " Nimal.PERERA ");
        Assert.False(taken.Available);
        Assert.Equal("taken", taken.Reason);

        var reserved = await CheckAvailabilityAsync(controller, "admin");
        Assert.False(reserved.Available);
        Assert.Equal("reserved", reserved.Reason);

        var invalid = await CheckAvailabilityAsync(controller, "no..dots");
        Assert.False(invalid.Available);
        Assert.Equal("invalid", invalid.Reason);

        var missing = await CheckAvailabilityAsync(controller, null);
        Assert.Equal("invalid", missing.Reason);
    }

    [Fact]
    public async Task UsernameAvailable_CallersOwnUsername_CountsAsAvailable()
    {
        var (db, users) = await CreateAsync();
        var user = await CreateUserAsync(users, "nimal.perera", "Nimal Perera", "Farmer");
        await CreateUserAsync(users, "kumari.silva", "Kumari Silva", "Buyer");
        var controller = BuildController(db, users, user.Id, "Farmer");

        Assert.True((await CheckAvailabilityAsync(controller, "nimal.perera")).Available);
        Assert.Equal("taken", (await CheckAvailabilityAsync(controller, "kumari.silva")).Reason);
    }
}
