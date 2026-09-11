using AgriLink.API.Data;
using AgriLink.API.DTOs.Harvests;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/harvests")]
public class HarvestsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public HarvestsController(AgriLinkDbContext db, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<List<HarvestListingResponse>>> GetAll([FromQuery] string? cropType, [FromQuery] string? district)
    {
        var query = _db.HarvestListings
            .Include(h => h.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Where(h => h.Status == HarvestStatus.Active)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(cropType))
        {
            query = query.Where(h => h.Crop.CropType.ToLower() == cropType.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(district))
        {
            query = query.Where(h => h.Crop.Field.Farm.District.ToLower() == district.ToLower());
        }

        var listings = await query.OrderByDescending(h => h.CreatedAt).ToListAsync();
        return Ok(listings.Select(ToResponse));
    }

    /// <summary>
    /// The logged-in farmer's own listings, every status included — unlike GetAll, which
    /// only shows Active listings to the public marketplace. "mine" must be declared ahead of
    /// {id:int} to be attempted first, though the int route constraint alone would already
    /// stop "mine" from matching it.
    /// </summary>
    [HttpGet("mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<HarvestListingResponse>>> Mine()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var listings = await _db.HarvestListings
            .Include(h => h.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .Where(h => h.FarmerProfileId == farmerProfileId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        return Ok(listings.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<HarvestListingResponse>> GetById(int id)
    {
        var listing = await _db.HarvestListings
            .Include(h => h.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(h => h.HarvestId == id);

        if (listing is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(listing));
    }

    [HttpPost]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<HarvestListingResponse>> Create(CreateHarvestListingRequest request)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var crop = await _db.Crops
            .Include(c => c.Field).ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(c => c.CropId == request.CropId);

        if (crop is null)
        {
            return NotFound(new { message = "Crop not found." });
        }

        if (crop.Field.Farm.FarmerProfileId != farmerProfileId)
        {
            return Forbid();
        }

        var listing = new HarvestListing
        {
            FarmerProfileId = farmerProfileId.Value,
            CropId = request.CropId,
            Quantity = request.Quantity,
            AvailableQuantity = request.Quantity,
            HarvestDate = request.HarvestDate,
            PricePerUnit = request.PricePerUnit,
            Location = request.Location,
            Status = HarvestStatus.Active,
        };

        _db.HarvestListings.Add(listing);
        await _db.SaveChangesAsync();

        listing.Crop = crop;
        return StatusCode(StatusCodes.Status201Created, ToResponse(listing));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Farmer,Admin")]
    public async Task<ActionResult<HarvestListingResponse>> Update(int id, UpdateHarvestListingRequest request)
    {
        var listing = await _db.HarvestListings
            .Include(h => h.Crop).ThenInclude(c => c.Field).ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(h => h.HarvestId == id);

        if (listing is null)
        {
            return NotFound();
        }

        if (!_currentUser.IsAdmin(User))
        {
            var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
            if (farmerProfileId is null || listing.FarmerProfileId != farmerProfileId)
            {
                return Forbid();
            }
        }

        var oldStatus = listing.Status;

        if (request.Status.HasValue)
        {
            listing.Status = request.Status.Value;
        }

        if (request.PricePerUnit.HasValue)
        {
            listing.PricePerUnit = request.PricePerUnit.Value;
        }

        if (request.Location is not null)
        {
            listing.Location = request.Location;
        }

        if (request.HarvestDate.HasValue)
        {
            listing.HarvestDate = request.HarvestDate.Value;
        }

        // Only the admin-override path is audited here — a farmer editing their own listing
        // is routine self-service, not the kind of cross-account action the log is for.
        if (_currentUser.IsAdmin(User))
        {
            _auditLog.Record(
                _currentUser.GetUserId(User),
                "HarvestListingUpdatedByAdmin",
                "HarvestListing",
                listing.HarvestId,
                oldStatus.ToString(),
                listing.Status.ToString());
        }

        await _db.SaveChangesAsync();
        return Ok(ToResponse(listing));
    }

    private static HarvestListingResponse ToResponse(HarvestListing listing) => new()
    {
        HarvestId = listing.HarvestId,
        FarmerProfileId = listing.FarmerProfileId,
        CropId = listing.CropId,
        CropType = listing.Crop.CropType,
        Variety = listing.Crop.Variety,
        Quantity = listing.Quantity,
        AvailableQuantity = listing.AvailableQuantity,
        HarvestDate = listing.HarvestDate,
        PricePerUnit = listing.PricePerUnit,
        Location = listing.Location,
        District = listing.Crop.Field.Farm.District,
        Status = listing.Status.ToString(),
        CreatedAt = listing.CreatedAt,
    };
}
