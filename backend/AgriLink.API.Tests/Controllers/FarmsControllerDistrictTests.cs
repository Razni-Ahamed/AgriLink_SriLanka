using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Farms;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// A farm's district is inherited by every harvest listing raised from its crops and drives the
/// marketplace district filter, so this endpoint constrains it to the same fixed list
/// registration uses. It previously accepted any string.
/// </summary>
public class FarmsControllerDistrictTests
{
    private const int FarmerProfileId = 1;
    private const int FarmerUserId = 10;

    private static AgriLinkDbContext SeedFarmer()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        db.FarmerProfiles.Add(new FarmerProfile
        {
            FarmerProfileId = FarmerProfileId,
            UserId = FarmerUserId,
            NIC = "1",
            District = "Kandy",
        });
        db.SaveChanges();
        return db;
    }

    private static FarmsController CreateController(AgriLinkDbContext db) =>
        new(db, new CurrentUserService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(FarmerUserId, "Farmer"),
                },
            },
        };

    [Fact]
    public async Task CreateFarm_UnknownDistrict_ReturnsBadRequestAndCreatesNothing()
    {
        var db = SeedFarmer();
        var controller = CreateController(db);

        var result = await controller.CreateFarm(new CreateFarmRequest
        {
            Name = "Green Acres",
            District = "Notaplace",
            Area = 5,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Farms);
    }

    [Theory]
    [InlineData("kandy")]
    [InlineData("  Kandy  ")]
    public async Task CreateFarm_StoresCanonicalDistrictSpelling(string typed)
    {
        var db = SeedFarmer();
        var controller = CreateController(db);

        var result = await controller.CreateFarm(new CreateFarmRequest
        {
            Name = "Green Acres",
            District = typed,
            Area = 5,
        });

        Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal("Kandy", Assert.Single(db.Farms).District);
    }

    [Fact]
    public async Task UpdateFarm_UnknownDistrict_ReturnsBadRequestAndLeavesFarmUnchanged()
    {
        var db = SeedFarmer();
        db.Farms.Add(new Farm
        {
            FarmId = 1,
            Name = "Green Acres",
            District = "Kandy",
            Area = 5,
            FarmerProfileId = FarmerProfileId,
        });
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var result = await controller.UpdateFarm(1, new UpdateFarmRequest
        {
            Name = "Renamed",
            District = "Notaplace",
            Area = 9,
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        var farm = Assert.Single(db.Farms);
        Assert.Equal("Green Acres", farm.Name);
        Assert.Equal("Kandy", farm.District);
    }
}
