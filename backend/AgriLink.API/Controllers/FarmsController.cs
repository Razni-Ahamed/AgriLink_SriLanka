using AgriLink.API.Data;
using AgriLink.API.DTOs.Farms;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/farms")]
[Authorize(Roles = "Farmer,Admin")]
public class FarmsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public FarmsController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private static FarmDto ToDto(Farm f) => new()
    {
        FarmId = f.FarmId,
        Name = f.Name,
        District = f.District,
        Area = f.Area,
        CreatedAt = f.CreatedAt,
    };

    private static FieldDto ToDto(Field f) => new()
    {
        FieldId = f.FieldId,
        FarmId = f.FarmId,
        Name = f.Name,
        Area = f.Area,
    };

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FarmDto>>> GetFarms()
    {
        IQueryable<Farm> query = _db.Farms;

        if (!_currentUser.IsAdmin(User))
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null)
            {
                return Ok(Enumerable.Empty<FarmDto>());
            }
            query = query.Where(f => f.FarmerProfileId == farmerProfileId);
        }

        var farms = await query.OrderByDescending(f => f.CreatedAt).ToListAsync();
        return Ok(farms.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<FarmDto>> CreateFarm(CreateFarmRequest request)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return BadRequest(new { message = "Only users with a farmer profile can create farms." });
        }

        var farm = new Farm
        {
            FarmerProfileId = farmerProfileId.Value,
            Name = request.Name,
            District = request.District,
            Area = request.Area,
        };

        _db.Farms.Add(farm);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFarms), new { farmId = farm.FarmId }, ToDto(farm));
    }

    [HttpPut("{farmId:int}")]
    public async Task<ActionResult<FarmDto>> UpdateFarm(int farmId, UpdateFarmRequest request)
    {
        var farm = await _db.Farms.FirstOrDefaultAsync(f => f.FarmId == farmId);
        if (farm is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(farm.FarmerProfileId))
        {
            return Forbid();
        }

        farm.Name = request.Name;
        farm.District = request.District;
        farm.Area = request.Area;
        await _db.SaveChangesAsync();

        return Ok(ToDto(farm));
    }

    [HttpDelete("{farmId:int}")]
    public async Task<IActionResult> DeleteFarm(int farmId)
    {
        var farm = await _db.Farms
            .Include(f => f.Fields)
            .ThenInclude(field => field.Crops)
            .FirstOrDefaultAsync(f => f.FarmId == farmId);

        if (farm is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(farm.FarmerProfileId))
        {
            return Forbid();
        }

        if (farm.Fields.Any(field => field.Crops.Count > 0))
        {
            return BadRequest(new { message = "Cannot delete a farm that has crops planted. Remove crops first." });
        }

        _db.Farms.Remove(farm);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{farmId:int}/fields")]
    public async Task<ActionResult<IEnumerable<FieldDto>>> GetFields(int farmId)
    {
        var farm = await _db.Farms.Include(f => f.Fields).FirstOrDefaultAsync(f => f.FarmId == farmId);
        if (farm is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(farm.FarmerProfileId))
        {
            return Forbid();
        }

        return Ok(farm.Fields.Select(ToDto));
    }

    [HttpPost("{farmId:int}/fields")]
    public async Task<ActionResult<FieldDto>> AddField(int farmId, CreateFieldRequest request)
    {
        var farm = await _db.Farms.FirstOrDefaultAsync(f => f.FarmId == farmId);
        if (farm is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(farm.FarmerProfileId))
        {
            return Forbid();
        }

        var field = new Field
        {
            FarmId = farm.FarmId,
            Name = request.Name,
            Area = request.Area,
        };

        _db.Fields.Add(field);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFields), new { farmId = farm.FarmId }, ToDto(field));
    }

    private async Task<bool> IsOwnerOrAdminAsync(int farmerProfileId)
    {
        if (_currentUser.IsAdmin(User))
        {
            return true;
        }
        var callerFarmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        return callerFarmerProfileId == farmerProfileId;
    }
}
