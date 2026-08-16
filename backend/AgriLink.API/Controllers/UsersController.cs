using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UsersController(UserManager<ApplicationUser> userManager, AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> Me()
    {
        var userId = _currentUser.GetUserId(User);
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;

        var response = new UserProfileResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = role,
        };

        if (role == "Farmer")
        {
            var profile = await _db.FarmerProfiles.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == user.Id);
            response.NIC = profile?.NIC;
            response.District = profile?.District;
        }
        else if (role == "Officer")
        {
            var profile = await _db.OfficerProfiles.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == user.Id);
            response.District = profile?.District;
        }
        else if (role == "Buyer")
        {
            var profile = await _db.BuyerProfiles.AsNoTracking().FirstOrDefaultAsync(b => b.UserId == user.Id);
            response.District = profile?.District;
        }

        return Ok(response);
    }
}
