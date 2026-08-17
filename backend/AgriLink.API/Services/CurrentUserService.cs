using System.Security.Claims;
using AgriLink.API.Data;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly AgriLinkDbContext _db;

    public CurrentUserService(AgriLinkDbContext db)
    {
        _db = db;
    }

    public int GetUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (value is null || !int.TryParse(value, out var userId))
        {
            throw new InvalidOperationException("Authenticated principal has no valid user id claim.");
        }
        return userId;
    }

    public bool IsAdmin(ClaimsPrincipal principal) => principal.IsInRole("Admin");

    public async Task<int?> GetFarmerProfileIdAsync(ClaimsPrincipal principal)
    {
        var userId = GetUserId(principal);
        return await _db.FarmerProfiles
            .Where(f => f.UserId == userId)
            .Select(f => (int?)f.FarmerProfileId)
            .FirstOrDefaultAsync();
    }

    public async Task<int?> GetOfficerProfileIdAsync(ClaimsPrincipal principal)
    {
        var userId = GetUserId(principal);
        return await _db.OfficerProfiles
            .Where(o => o.UserId == userId)
            .Select(o => (int?)o.OfficerProfileId)
            .FirstOrDefaultAsync();
    }

    public async Task<int?> GetBuyerProfileIdAsync(ClaimsPrincipal principal)
    {
        var userId = GetUserId(principal);
        return await _db.BuyerProfiles
            .Where(b => b.UserId == userId)
            .Select(b => (int?)b.BuyerProfileId)
            .FirstOrDefaultAsync();
    }
}
