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

public class FarmsControllerFieldTests
{
    private const int OwnerUserId = 10;
    private const int StrangerUserId = 20;

    private static AgriLinkDbContext Seed()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = 1, UserId = OwnerUserId, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = 2, UserId = StrangerUserId, NIC = "2", District = "Galle" });
        db.Farms.Add(new Farm
        {
            FarmId = 1,
            Name = "Green Acres",
            District = "Kandy",
            Area = 10,
            FarmerProfileId = 1,
            Fields = new List<Field> { new() { FieldId = 1, Name = "North Field", Area = 2 } },
        });
        db.SaveChanges();
        return db;
    }

    private static FarmsController CreateController(AgriLinkDbContext db, int actingUserId) =>
        new(db, new CurrentUserService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(actingUserId, "Farmer") },
            },
        };

    [Fact]
    public async Task UpdateField_ByTheOwner_RenamesAndResizesIt()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).UpdateField(1, 1, new CreateFieldRequest { Name = "Upper Field", Area = 3.5m });

        var field = Assert.IsType<FieldDto>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Upper Field", field.Name);
        Assert.Equal(3.5m, (await db.Fields.SingleAsync()).Area);
    }

    [Fact]
    public async Task UpdateField_ByAnotherFarmer_IsForbidden()
    {
        var db = Seed();

        var result = await CreateController(db, StrangerUserId).UpdateField(1, 1, new CreateFieldRequest { Name = "Taken", Area = 1 });

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Equal("North Field", (await db.Fields.SingleAsync()).Name);
    }

    [Fact]
    public async Task AddField_LargerThanItsFarm_IsRefused()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).AddField(1, new CreateFieldRequest { Name = "Huge", Area = 5000 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Single(db.Fields);
    }

    [Fact]
    public async Task UpdateField_LargerThanItsFarm_IsRefused()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).UpdateField(1, 1, new CreateFieldRequest { Name = "North Field", Area = 11 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(2, (await db.Fields.SingleAsync()).Area);
    }

    [Fact]
    public async Task UpdateFarm_SmallerThanOneOfItsFields_IsRefused()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).UpdateFarm(1, new UpdateFarmRequest { Name = "Green Acres", District = "Kandy", Area = 1 });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(10, (await db.Farms.SingleAsync()).Area);
    }

    [Fact]
    public async Task DeleteField_Empty_RemovesIt()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).DeleteField(1, 1);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(db.Fields);
    }

    [Fact]
    public async Task DeleteField_WithACrop_IsRefused()
    {
        var db = Seed();
        db.Crops.Add(new Crop { FieldId = 1, CropType = "Tomato" });
        db.SaveChanges();

        var result = await CreateController(db, OwnerUserId).DeleteField(1, 1);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Single(db.Fields);
    }

    [Fact]
    public async Task DeleteField_UnderTheWrongFarm_IsNotFound()
    {
        var db = Seed();

        var result = await CreateController(db, OwnerUserId).DeleteField(99, 1);

        Assert.IsType<NotFoundResult>(result);
    }
}
