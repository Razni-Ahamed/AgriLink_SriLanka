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

        // Crop type is a category the marketplace groups by and the advisory engine matches
        // rules against, so it is taken from the fixed catalogue and stored in the catalogue's
        // own spelling — not as whatever the caller happened to type.
        var cropType = CropTypes.Canonicalize(request.CropType);
        if (cropType is null)
        {
            return BadRequest(new { message = "Crop type must be one of the supported crop types." });
        }

        var crop = new Crop
        {
            FieldId = field.FieldId,
            CropType = cropType,
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

    /// <summary>
    /// The crops planted in one field. Without this the client had no way to list a field's
    /// crops at all: it cached the crops it had just created in memory and lost them on the
    /// next refresh, which left every crop — and so every "report an issue" and "list for
    /// sale" action hanging off a crop — unreachable after a reload.
    /// </summary>
    [HttpGet("fields/{fieldId:int}/crops")]
    public async Task<ActionResult<List<CropDto>>> GetFieldCrops(int fieldId)
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

        var crops = await _db.Crops
            .AsNoTracking()
            .Where(c => c.FieldId == fieldId)
            .OrderByDescending(c => c.CropId)
            .ToListAsync();

        return Ok(crops.Select(ToDto).ToList());
    }

    /// <summary>
    /// Every crop belonging to the calling farmer, with its field and farm names, for the crop
    /// pickers on "Report an Issue" and "New Listing". Farmer-only: it is scoped to the
    /// caller's own farmer profile, so there is nothing here for an Admin to read.
    /// </summary>
    [HttpGet("crops/mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<FarmerCropSummary>>> MyCrops()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Ok(new List<FarmerCropSummary>());
        }

        var crops = await _db.Crops
            .AsNoTracking()
            .Include(c => c.Field).ThenInclude(f => f.Farm)
            .Where(c => c.Field.Farm.FarmerProfileId == farmerProfileId)
            .OrderByDescending(c => c.CropId)
            .Select(c => new FarmerCropSummary
            {
                CropId = c.CropId,
                CropType = c.CropType,
                Variety = c.Variety,
                Status = c.Status.ToString(),
                PlantingDate = c.PlantingDate,
                ExpectedHarvestDate = c.ExpectedHarvestDate,
                ExpectedQuantity = c.ExpectedQuantity,
                FieldId = c.FieldId,
                FieldName = c.Field.Name,
                FarmId = c.Field.FarmId,
                FarmName = c.Field.Farm.Name,
                District = c.Field.Farm.District,
            })
            .ToListAsync();

        return Ok(crops);
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
