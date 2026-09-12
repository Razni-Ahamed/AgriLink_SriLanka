using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private static readonly string[] CreatableRoles = { "Officer", "Buyer" };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AdminController(
        UserManager<ApplicationUser> userManager,
        AgriLinkDbContext db,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _userManager = userManager;
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    [HttpPost("users")]
    public async Task<ActionResult<CreateUserResponse>> CreateUser(CreateUserRequest request)
    {
        var role = CreatableRoles.FirstOrDefault(r => string.Equals(r, request.Role, StringComparison.OrdinalIgnoreCase));
        if (role is null)
        {
            return BadRequest(new { message = "Role must be 'Officer' or 'Buyer'." });
        }

        var district = SriLankaDistricts.Canonicalize(request.District);
        if (district is null)
        {
            return BadRequest(new { message = "District must be one of Sri Lanka's 25 administrative districts." });
        }

        Department? department = null;
        if (role == "Officer")
        {
            if (request.DepartmentId is null)
            {
                return BadRequest(new { message = "Department is required when creating an Officer account." });
            }

            department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == request.DepartmentId);
            if (department is null)
            {
                return BadRequest(new { message = "The selected department does not exist." });
            }
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
                DepartmentId = department!.DepartmentId,
                District = district,
            });
        }
        else
        {
            _db.BuyerProfiles.Add(new BuyerProfile
            {
                UserId = user.Id,
                BusinessName = request.BusinessName ?? string.Empty,
                District = district,
            });
        }

        _auditLog.Record(_currentUser.GetUserId(User), "UserCreated", "User", user.Id, null, role);

        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new CreateUserResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email!,
            Role = role,
        });
    }

    [HttpGet("roles")]
    public ActionResult<List<string>> GetRoles() => Ok(RoleSeeder.Roles.ToList());

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserSummary>>> GetUsers()
    {
        var users = await _db.Users.OrderBy(u => u.CreatedAt).ToListAsync();

        // A handful of small dictionary reads beat an N+1 profile lookup per user; a
        // course-project dataset never gets large enough for this shape to matter either way.
        var farmerDistricts = await _db.FarmerProfiles.ToDictionaryAsync(f => f.UserId, f => f.District);
        var officerDistricts = await _db.OfficerProfiles.ToDictionaryAsync(o => o.UserId, o => o.District);
        var buyerDistricts = await _db.BuyerProfiles.ToDictionaryAsync(b => b.UserId, b => b.District);
        var officerDepartments = await _db.OfficerProfiles
            .Include(o => o.Department)
            .ToDictionaryAsync(o => o.UserId, o => o.Department.Name);

        var summaries = new List<AdminUserSummary>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var district = farmerDistricts.GetValueOrDefault(user.Id)
                ?? officerDistricts.GetValueOrDefault(user.Id)
                ?? buyerDistricts.GetValueOrDefault(user.Id);

            summaries.Add(new AdminUserSummary
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Role = roles.FirstOrDefault() ?? string.Empty,
                District = district,
                Department = officerDepartments.GetValueOrDefault(user.Id),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
            });
        }

        return Ok(summaries);
    }

    [HttpPut("users/{userId:int}/role")]
    public async Task<ActionResult<AdminUserSummary>> UpdateUserRole(int userId, UpdateUserRoleRequest request)
    {
        var newRole = CreatableRoles.FirstOrDefault(r => string.Equals(r, request.Role, StringComparison.OrdinalIgnoreCase));
        if (newRole is null)
        {
            return BadRequest(new { message = "Role must be 'Officer' or 'Buyer'." });
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        var currentRole = currentRoles.FirstOrDefault();

        if (currentRole is null || !CreatableRoles.Contains(currentRole))
        {
            // Farmer accounts self-register and own farm/crop data keyed off FarmerProfile;
            // Admin is the single account seeded at startup. Re-typing either through this
            // endpoint would either orphan a farmer's data or let an admin demote themselves
            // out of the only account that can create privileged users, so both are refused.
            return BadRequest(new { message = "Only Officer and Buyer accounts can have their role changed here." });
        }

        if (string.Equals(currentRole, newRole, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"User already has the {newRole} role." });
        }

        var district = SriLankaDistricts.Canonicalize(request.District);
        if (district is null)
        {
            return BadRequest(new { message = "District must be one of Sri Lanka's 25 administrative districts." });
        }

        Department? department = null;
        if (newRole == "Officer")
        {
            if (request.DepartmentId is null)
            {
                return BadRequest(new { message = "Department is required when assigning the Officer role." });
            }

            department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == request.DepartmentId);
            if (department is null)
            {
                return BadRequest(new { message = "The selected department does not exist." });
            }
        }

        if (newRole == "Buyer" && string.IsNullOrWhiteSpace(request.BusinessName))
        {
            return BadRequest(new { message = "Business name is required when assigning the Buyer role." });
        }

        var removeResult = await _userManager.RemoveFromRoleAsync(user, currentRole);
        if (!removeResult.Succeeded)
        {
            return BadRequest(new { errors = removeResult.Errors.Select(e => e.Description) });
        }

        var addResult = await _userManager.AddToRoleAsync(user, newRole);
        if (!addResult.Succeeded)
        {
            return BadRequest(new { errors = addResult.Errors.Select(e => e.Description) });
        }

        // Officer and Buyer profiles live in different tables, so removing one and adding the
        // other in the same SaveChanges call can never collide on the UserId unique index.
        if (currentRole == "Officer")
        {
            var officerProfile = await _db.OfficerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (officerProfile is not null)
            {
                _db.OfficerProfiles.Remove(officerProfile);
            }
        }
        else
        {
            var buyerProfile = await _db.BuyerProfiles.FirstOrDefaultAsync(b => b.UserId == userId);
            if (buyerProfile is not null)
            {
                _db.BuyerProfiles.Remove(buyerProfile);
            }
        }

        if (newRole == "Officer")
        {
            _db.OfficerProfiles.Add(new OfficerProfile
            {
                UserId = userId,
                DepartmentId = department!.DepartmentId,
                District = district,
            });
        }
        else
        {
            _db.BuyerProfiles.Add(new BuyerProfile
            {
                UserId = userId,
                BusinessName = request.BusinessName!,
                District = district,
            });
        }

        _auditLog.Record(_currentUser.GetUserId(User), "RoleChanged", "User", userId, currentRole, newRole);
        await _db.SaveChangesAsync();

        return Ok(new AdminUserSummary
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = newRole,
            District = district,
            Department = department?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpPut("users/{userId:int}/status")]
    public async Task<ActionResult<AdminUserSummary>> UpdateUserStatus(int userId, UpdateUserStatusRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return NotFound();
        }

        if (await _userManager.IsInRoleAsync(user, AdminSeeder.AdminRole))
        {
            // Admin accounts are provisioned only by the startup seeder — deactivating the
            // last one would deadlock the system the same way the seeder's own comment warns
            // about for account creation, so it is refused unconditionally.
            return BadRequest(new { message = "Admin accounts cannot be deactivated." });
        }

        if (user.IsActive == request.IsActive)
        {
            return BadRequest(new { message = request.IsActive ? "User is already active." : "User is already deactivated." });
        }

        var oldValue = user.IsActive.ToString();
        user.IsActive = request.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(new { errors = updateResult.Errors.Select(e => e.Description) });
        }

        _auditLog.Record(
            _currentUser.GetUserId(User),
            request.IsActive ? "UserActivated" : "UserDeactivated",
            "User",
            userId,
            oldValue,
            request.IsActive.ToString());
        await _db.SaveChangesAsync();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new AdminUserSummary
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = roles.FirstOrDefault() ?? string.Empty,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<List<AuditLogResponse>>> GetAuditLogs([FromQuery] string? entityName, [FromQuery] int take = 100)
    {
        var limit = Math.Clamp(take, 1, 500);

        var query = _db.AuditLogs.Include(a => a.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(entityName))
        {
            query = query.Where(a => a.EntityName == entityName);
        }

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(logs.Select(a => new AuditLogResponse
        {
            AuditId = a.AuditId,
            UserId = a.UserId,
            UserName = a.User.FullName,
            Action = a.Action,
            EntityName = a.EntityName,
            EntityId = a.EntityId,
            OldValue = a.OldValue,
            NewValue = a.NewValue,
            CreatedAt = a.CreatedAt,
        }));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<AdminMetricsResponse>> Metrics()
    {
        var now = DateTime.UtcNow;

        var totalUsers = await _db.Users.CountAsync();
        var totalFarms = await _db.Farms.CountAsync();
        var totalCrops = await _db.Crops.CountAsync();
        var issuesReported = await _db.CropIssues.CountAsync();
        var issuesResolved = await _db.CropIssues.CountAsync(i => i.Status == IssueStatus.Resolved);
        var harvestVolumeSoldThisMonth = await _db.Orders
            .Where(o => o.Status == OrderStatus.Completed
                && o.CompletedAt.HasValue
                && o.CompletedAt.Value.Year == now.Year
                && o.CompletedAt.Value.Month == now.Month)
            .SumAsync(o => (decimal?)o.TotalQuantity) ?? 0;

        return Ok(new AdminMetricsResponse
        {
            TotalUsers = totalUsers,
            TotalFarms = totalFarms,
            TotalCrops = totalCrops,
            IssuesReported = issuesReported,
            IssuesResolved = issuesResolved,
            HarvestVolumeSoldThisMonth = harvestVolumeSoldThisMonth,
        });
    }
}
