using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Harvests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class HarvestsControllerSearchSortTests
{
    private static AgriLinkDbContext Seed()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        var farmerUser = new ApplicationUser { Id = 10, UserName = "farmer", Email = "farmer@test.lk", FullName = "Farmer", IsActive = true };
        var farmer = new FarmerProfile { FarmerProfileId = 1, User = farmerUser, NIC = "1", District = "Kandy" };
        db.FarmerProfiles.Add(farmer);

        var start = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);
        (int Id, string CropType, string Variety, string District, string Location, decimal Price, decimal Available, int HarvestDay)[] listings =
        {
            (1, "Tomato", "Roma", "Kandy", "Peradeniya market", 120, 40, 20),
            (2, "Paddy", "BG 358", "Galle", "Hikkaduwa mill", 95, 900, 10),
            (3, "Tomato", "Thilina", "Matale", "Dambulla centre", 150, 60, 25),
            (4, "Cassava", "MU 51", "Kandy", "Katugastota", 60, 300, 5),
        };
        foreach (var l in listings)
        {
            db.HarvestListings.Add(new HarvestListing
            {
                HarvestId = l.Id,
                FarmerProfile = farmer,
                Crop = new Crop
                {
                    CropType = l.CropType,
                    Variety = l.Variety,
                    Field = new Field { Name = "F", Farm = new Farm { Name = "Farm", District = l.District, FarmerProfile = farmer } },
                },
                Quantity = l.Available,
                AvailableQuantity = l.Available,
                PricePerUnit = l.Price,
                Location = l.Location,
                HarvestDate = new DateOnly(2026, 9, l.HarvestDay),
                CreatedAt = start.AddDays(l.Id),
            });
        }

        db.SaveChanges();
        return db;
    }

    private static HarvestsController Controller(AgriLinkDbContext db) =>
        new(db, new CurrentUserService(db), new AuditLogService(db), new NotificationService(db));

    private static List<int> Ids(ActionResult<List<HarvestListingResponse>> result) =>
        Assert.IsAssignableFrom<IEnumerable<HarvestListingResponse>>(Assert.IsType<OkObjectResult>(result.Result).Value)
            .Select(h => h.HarvestId).ToList();

    [Theory]
    [InlineData(null, new[] { 4, 3, 2, 1 })] // newest listed first
    [InlineData("priceAsc", new[] { 4, 2, 1, 3 })]
    [InlineData("priceDesc", new[] { 3, 1, 2, 4 })]
    [InlineData("quantityDesc", new[] { 2, 4, 3, 1 })]
    [InlineData("freshest", new[] { 3, 1, 2, 4 })] // most recently harvested first
    public async Task GetAll_SortsAsAsked(string? sort, int[] expected)
    {
        using var db = Seed();

        Assert.Equal(expected, Ids(await Controller(db).GetAll(null, null, sort: sort)));
    }

    [Theory]
    [InlineData("tomato", new[] { 3, 1 })] // crop type
    [InlineData("BG 358", new[] { 2 })] // variety
    [InlineData(" dambulla ", new[] { 3 })] // collection point, trimmed and case-insensitive
    [InlineData("galle", new[] { 2 })] // district
    public async Task GetAll_SearchMatchesCropVarietyLocationOrDistrict(string search, int[] expected)
    {
        using var db = Seed();

        Assert.Equal(expected, Ids(await Controller(db).GetAll(null, null, search: search)));
    }

    [Fact]
    public async Task GetAll_PriceRangeAndFiltersCombine()
    {
        using var db = Seed();

        Assert.Equal(new[] { 2, 1 }, Ids(await Controller(db).GetAll(null, null, minPrice: 90, maxPrice: 130)));
        Assert.Equal(new[] { 1 }, Ids(await Controller(db).GetAll("Tomato", "Kandy", minPrice: 100, sort: "priceAsc")));
    }

    [Fact]
    public async Task GetAll_UnknownSort_IsABadRequest()
    {
        using var db = Seed();

        Assert.IsType<BadRequestObjectResult>((await Controller(db).GetAll(null, null, sort: "cheapest")).Result);
    }
}
