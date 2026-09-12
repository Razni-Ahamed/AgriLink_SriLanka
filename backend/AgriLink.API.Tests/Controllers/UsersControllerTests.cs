using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class UsersControllerTests
{
    private static async Task<(AgriLinkDbContext Db, UserManager<ApplicationUser> Users)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);
        return (db, userManager);
    }

    private static UsersController BuildController(
        AgriLinkDbContext db,
        UserManager<ApplicationUser> users,
        int actingUserId,
        string role) => new(users, db, new CurrentUserService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    private static async Task<ApplicationUser> CreateUserAsync(
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
}
