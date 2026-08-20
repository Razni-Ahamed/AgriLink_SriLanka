using AgriLink.API.Data;
using AgriLink.API.DTOs.Crops;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api")]
[Authorize(Roles = "Farmer,Admin")]
public class CropsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CropsController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private static CropDto ToDto(Crop c) => new()
    {
        CropId = c.CropId,
        FieldId = c.FieldId,
        CropType = c.CropType,
        Variety = c.Variety,
        PlantingDate = c.PlantingDate,
        ExpectedHarvestDate = c.ExpectedHarvestDate,
        ExpectedQuantity = c.ExpectedQuantity,
        Status = c.Status.ToString(),
    };

    [HttpPost("fields/{fieldId:int}/crops")]
    public async Task<ActionResult<CropDto>> PlantCrop(int fieldId, CreateCropRequest request)
    {
        var field = await _db.Fields.Include(f => f.Farm).FirstOrDefaultAsync(f => f.FieldId == fieldId);
        if (field is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(field.Farm.FarmerProfileId))
        {
            return Forbid();
        }

        var crop = new Crop
        {
            FieldId = field.FieldId,
            CropType = request.CropType,
            Variety = request.Variety,
            PlantingDate = request.PlantingDate,
            ExpectedHarvestDate = request.ExpectedHarvestDate,
            ExpectedQuantity = request.ExpectedQuantity,
            Status = CropStatus.Seeded,
        };

        _db.Crops.Add(crop);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCrop), new { cropId = crop.CropId }, ToDto(crop));
    }

    [HttpGet("crops/{cropId:int}")]
    public async Task<ActionResult<CropDto>> GetCrop(int cropId)
    {
        var crop = await _db.Crops.Include(c => c.Field).ThenInclude(f => f.Farm).FirstOrDefaultAsync(c => c.CropId == cropId);
        if (crop is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(crop.Field.Farm.FarmerProfileId))
        {
            return Forbid();
        }

        return Ok(ToDto(crop));
    }

    [HttpPut("crops/{cropId:int}")]
    public async Task<ActionResult<CropDto>> UpdateCrop(int cropId, UpdateCropRequest request)
    {
        var crop = await _db.Crops.Include(c => c.Field).ThenInclude(f => f.Farm).FirstOrDefaultAsync(c => c.CropId == cropId);
        if (crop is null)
        {
            return NotFound();
        }

        if (!await IsOwnerOrAdminAsync(crop.Field.Farm.FarmerProfileId))
        {
            return Forbid();
        }

        crop.Status = request.Status;
        await _db.SaveChangesAsync();

        return Ok(ToDto(crop));
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
