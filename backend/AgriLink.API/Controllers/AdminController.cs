using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private static readonly string[] CreatableRoles = { "Officer", "Buyer" };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;

    public AdminController(UserManager<ApplicationUser> userManager, AgriLinkDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    [HttpPost("users")]
    public async Task<ActionResult<CreateUserResponse>> CreateUser(CreateUserRequest request)
    {
        var role = CreatableRoles.FirstOrDefault(r => string.Equals(r, request.Role, StringComparison.OrdinalIgnoreCase));
        if (role is null)
        {
            return BadRequest(new { message = "Role must be 'Officer' or 'Buyer'." });
        }

        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return Conflict(new { message = "An account with this email already exists." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });
        }

        await _userManager.AddToRoleAsync(user, role);

        if (role == "Officer")
        {
            _db.OfficerProfiles.Add(new OfficerProfile
            {
                UserId = user.Id,
                Department = request.Department ?? string.Empty,
                District = request.District,
            });
        }
        else
        {
            _db.BuyerProfiles.Add(new BuyerProfile
            {
                UserId = user.Id,
                BusinessName = request.BusinessName ?? string.Empty,
                District = request.District,
            });
        }

        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new CreateUserResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email!,
            Role = role,
        });
    }
}
