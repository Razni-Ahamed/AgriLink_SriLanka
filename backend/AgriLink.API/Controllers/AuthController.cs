using AgriLink.API.Data;
using AgriLink.API.DTOs.Auth;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly IJwtTokenService _tokenService;

    public AuthController(UserManager<ApplicationUser> userManager, AgriLinkDbContext db, IJwtTokenService tokenService)
    {
        _userManager = userManager;
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
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

        await _userManager.AddToRoleAsync(user, "Farmer");

        _db.FarmerProfiles.Add(new FarmerProfile
        {
            UserId = user.Id,
            NIC = request.NIC,
            District = request.District,
        });
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user, new[] { "Farmer" });
        return StatusCode(StatusCodes.Status201Created, new AuthResponse { Token = token, Role = "Farmer" });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !user.IsActive || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.GenerateToken(user, roles);
        return Ok(new AuthResponse { Token = token, Role = roles.FirstOrDefault() ?? string.Empty });
    }
}
