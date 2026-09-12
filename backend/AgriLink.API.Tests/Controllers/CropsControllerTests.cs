using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Crops;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class CropsControllerTests
{
    private const int OwnerProfileId = 1;
    private const int OwnerUserId = 10;
    private const int StrangerProfileId = 2;
    private const int StrangerUserId = 20;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    /// <summary>Two farmers, each with one farm and one field, so ownership can be exercised.</summary>
    private static AgriLinkDbContext SeedTwoFarmers()
    {
        var db = CreateDb();
        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = OwnerProfileId, UserId = OwnerUserId, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = StrangerProfileId, UserId = StrangerUserId, NIC = "2", District = "Galle" });

        db.Fields.AddRange(
            new Field
            {
                FieldId = 1,
                Name = "North Field",
                Farm = new Farm { FarmId = 1, Name = "Green Acres", District = "Kandy", FarmerProfileId = OwnerProfileId },
            },
            new Field
            {
                FieldId = 2,
                Name = "South Field",
                Farm = new Farm { FarmId = 2, Name = "Other Farm", District = "Galle", FarmerProfileId = StrangerProfileId },
            });

        db.SaveChanges();
        return db;
    }

    private static CropsController CreateController(AgriLinkDbContext db, int actingUserId, string role) =>
        new(db, new CurrentUserService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, role),
                },
            },
        };

    private static CreateCropRequest CropRequest(string cropType) => new()
    {
        CropType = cropType,
        Variety = "Local",
        PlantingDate = new DateOnly(2026, 1, 10),
        ExpectedHarvestDate = new DateOnly(2026, 4, 10),
        ExpectedQuantity = 500,
    };

    [Fact]
    public async Task PlantCrop_UnknownCropType_ReturnsBadRequestAndPlantsNothing()
    {
        var db = SeedTwoFarmers();
        var controller = CreateController(db, OwnerUserId, "Farmer");

        var result = await controller.PlantCrop(1, CropRequest("Tomatoe"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Crops);
    }

    [Theory]
    [InlineData("tea")]
    [InlineData("  Tea  ")]
    [InlineData("TEA")]
    public async Task PlantCrop_StoresCatalogueSpellingRegardlessOfCasing(string typed)
    {
        var db = SeedTwoFarmers();
        var controller = CreateController(db, OwnerUserId, "Farmer");

        var result = await controller.PlantCrop(1, CropRequest(typed));

        Assert.IsType<CreatedAtActionResult>(result.Result);
        // One spelling in the database, so the marketplace cannot split one crop into
        // several categories on casing alone.
        Assert.Equal("Tea", Assert.Single(db.Crops).CropType);
    }

    [Fact]
    public async Task GetFieldCrops_Owner_ReturnsCropsInThatField()
    {
        var db = SeedTwoFarmers();
        db.Crops.AddRange(
            new Crop { CropId = 1, FieldId = 1, CropType = "Paddy", Variety = "Samba" },
            new Crop { CropId = 2, FieldId = 1, CropType = "Chilli", Variety = "MI-2" },
            new Crop { CropId = 3, FieldId = 2, CropType = "Tea", Variety = "TRI" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, OwnerUserId, "Farmer");

        var result = await controller.GetFieldCrops(1);

        var crops = Assert.IsType<List<CropDto>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(2, crops.Count);
        Assert.All(crops, c => Assert.Equal(1, c.FieldId));
    }

    [Fact]
    public async Task GetFieldCrops_OtherFarmersField_IsForbidden()
    {
        var db = SeedTwoFarmers();
        db.Crops.Add(new Crop { CropId = 1, FieldId = 2, CropType = "Tea" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, OwnerUserId, "Farmer");

        var result = await controller.GetFieldCrops(2);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task MyCrops_ReturnsOnlyCallersCropsWithFarmAndFieldNames()
    {
        var db = SeedTwoFarmers();
        db.Crops.AddRange(
            new Crop { CropId = 1, FieldId = 1, CropType = "Paddy", Variety = "Samba" },
            new Crop { CropId = 3, FieldId = 2, CropType = "Tea", Variety = "TRI" });
        await db.SaveChangesAsync();

        var controller = CreateController(db, OwnerUserId, "Farmer");

        var result = await controller.MyCrops();

        var crops = Assert.IsType<List<FarmerCropSummary>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        var crop = Assert.Single(crops);
        Assert.Equal("Paddy", crop.CropType);
        // The picker labels each option with these, so a bare id is never shown to the farmer.
        Assert.Equal("North Field", crop.FieldName);
        Assert.Equal("Green Acres", crop.FarmName);
        Assert.Equal("Kandy", crop.District);
    }

    [Fact]
    public async Task MyCrops_FarmerWithNoProfile_ReturnsEmptyList()
    {
        var db = SeedTwoFarmers();
        var controller = CreateController(db, actingUserId: 999, role: "Farmer");

        var result = await controller.MyCrops();

        var crops = Assert.IsType<List<FarmerCropSummary>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Empty(crops);
    }
}
