using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

/// <summary>
/// Admin-only management of the Department list Officer accounts are assigned from. Nothing
/// else in the app reads this list outside the admin console, so the whole controller is
/// gated to Admin rather than exposing a public read endpoint.
/// </summary>
[ApiController]
[Route("api/admin/departments")]
[Authorize(Roles = "Admin")]
public class DepartmentsController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public DepartmentsController(AgriLinkDbContext db, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _db = db;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<List<DepartmentResponse>>> GetAll()
    {
        var departments = await _db.Departments.OrderBy(d => d.Name).ToListAsync();
        return Ok(departments.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentResponse>> Create(DepartmentRequest request)
    {
        var name = request.Name.Trim();
        var exists = await _db.Departments.AnyAsync(d => d.Name.ToLower() == name.ToLower());
        if (exists)
        {
            return Conflict(new { message = "A department with this name already exists." });
        }

        var department = new Department { Name = name };
        _db.Departments.Add(department);

        await _db.SaveChangesAsync();

        _auditLog.Record(_currentUser.GetUserId(User), "DepartmentCreated", "Department", department.DepartmentId, null, name);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToResponse(department));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DepartmentResponse>> Rename(int id, DepartmentRequest request)
    {
        var department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == id);
        if (department is null)
        {
            return NotFound();
        }

        var name = request.Name.Trim();
        var exists = await _db.Departments.AnyAsync(d => d.DepartmentId != id && d.Name.ToLower() == name.ToLower());
        if (exists)
        {
            return Conflict(new { message = "A department with this name already exists." });
        }

        var oldName = department.Name;
        department.Name = name;

        _auditLog.Record(_currentUser.GetUserId(User), "DepartmentRenamed", "Department", id, oldName, name);
        await _db.SaveChangesAsync();

        return Ok(ToResponse(department));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var department = await _db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == id);
        if (department is null)
        {
            return NotFound();
        }

        var inUse = await _db.OfficerProfiles.AnyAsync(o => o.DepartmentId == id);
        if (inUse)
        {
            return BadRequest(new { message = "This department has officers assigned to it. Reassign them before deleting it." });
        }

        _db.Departments.Remove(department);

        _auditLog.Record(_currentUser.GetUserId(User), "DepartmentDeleted", "Department", id, department.Name, null);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static DepartmentResponse ToResponse(Department department) => new()
    {
        DepartmentId = department.DepartmentId,
        Name = department.Name,
        CreatedAt = department.CreatedAt,
    };
}
