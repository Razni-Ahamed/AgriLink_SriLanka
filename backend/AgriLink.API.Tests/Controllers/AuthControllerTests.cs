using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AgriLink.API.Tests.Controllers;

public class AuthControllerTests
{
    private static async Task<(AuthController Controller, AgriLinkDbContext Db)> CreateAsync()
    {
        var (db, userManager, roleManager) = IdentityTestHarness.Create();
        await IdentityTestHarness.SeedRolesAsync(roleManager);

        var tokenService = Mock.Of<IJwtTokenService>(
            t => t.GenerateToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()) == "fake-jwt");
        var controller = new AuthController(userManager, db, tokenService);

        return (controller, db);
    }

    [Fact]
    public async Task Register_ValidDistrict_CreatesFarmerAccount()
    {
        var (controller, db) = await CreateAsync();

        var result = await controller.Register(new RegisterRequest
        {
            FullName = "New Farmer",
            Email = "new.farmer@agrilink.lk",
            Password = "Farmer@AgriLink.2026!",
            NIC = "199912345678",
            District = "Kandy",
        });

        Assert.IsType<ObjectResult>(result.Result);
        var profile = await db.FarmerProfiles.FirstOrDefaultAsync(f => f.User.Email == "new.farmer@agrilink.lk");
        Assert.NotNull(profile);
        Assert.Equal("Kandy", profile!.District);
    }

    [Fact]
    public async Task Register_UnknownDistrict_ReturnsBadRequestAndCreatesNoAccount()
    {
        var (controller, db) = await CreateAsync();

        var result = await controller.Register(new RegisterRequest
        {
            FullName = "New Farmer",
            Email = "new.farmer@agrilink.lk",
            Password = "Farmer@AgriLink.2026!",
            NIC = "199912345678",
            District = "Notaplace",
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Users);
    }

    [Theory]
    [InlineData("kandy")]
    [InlineData("  Kandy  ")]
    public async Task Register_DistrictCaseAndWhitespaceInsensitive_Succeeds(string district)
    {
        var (controller, _) = await CreateAsync();

        var result = await controller.Register(new RegisterRequest
        {
            FullName = "New Farmer",
            Email = "new.farmer@agrilink.lk",
            Password = "Farmer@AgriLink.2026!",
            NIC = "199912345678",
            District = district,
        });

        Assert.IsType<ObjectResult>(result.Result);
    }
}
