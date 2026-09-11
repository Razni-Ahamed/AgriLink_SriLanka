using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Admin;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

public class DepartmentsControllerTests
{
    private const int AdminUserId = 1;

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static DepartmentsController CreateController(AgriLinkDbContext db) => new(
        db,
        new CurrentUserService(db),
        new AuditLogService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(AdminUserId, "Admin") },
        },
    };

    [Fact]
    public async Task Create_NewName_SucceedsAndRecordsAudit()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Create(new DepartmentRequest { Name = "Crop Protection" });

        var created = Assert.IsType<DepartmentResponse>(Assert.IsType<ObjectResult>(result.Result).Value);
        Assert.Equal("Crop Protection", created.Name);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == created.DepartmentId && a.Action == "DepartmentCreated");
        Assert.NotNull(auditLog);
        Assert.Equal("Crop Protection", auditLog!.NewValue);
    }

    [Fact]
    public async Task Create_DuplicateNameCaseInsensitive_ReturnsConflict()
    {
        using var db = CreateDb();
        var controller = CreateController(db);
        await controller.Create(new DepartmentRequest { Name = "Extension" });

        var result = await controller.Create(new DepartmentRequest { Name = "extension" });

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Rename_ExistingDepartment_UpdatesNameAndRecordsAudit()
    {
        using var db = CreateDb();
        var controller = CreateController(db);
        var created = (await controller.Create(new DepartmentRequest { Name = "Old Name" })).Result as ObjectResult;
        var departmentId = ((DepartmentResponse)created!.Value!).DepartmentId;

        var result = await controller.Rename(departmentId, new DepartmentRequest { Name = "New Name" });

        var renamed = Assert.IsType<DepartmentResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("New Name", renamed.Name);

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == departmentId && a.Action == "DepartmentRenamed");
        Assert.NotNull(auditLog);
        Assert.Equal("Old Name", auditLog!.OldValue);
        Assert.Equal("New Name", auditLog.NewValue);
    }

    [Fact]
    public async Task Rename_UnknownDepartment_ReturnsNotFound()
    {
        using var db = CreateDb();
        var controller = CreateController(db);

        var result = await controller.Rename(999, new DepartmentRequest { Name = "Anything" });

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_UnusedDepartment_SucceedsAndRecordsAudit()
    {
        using var db = CreateDb();
        var controller = CreateController(db);
        var created = (await controller.Create(new DepartmentRequest { Name = "Unused" })).Result as ObjectResult;
        var departmentId = ((DepartmentResponse)created!.Value!).DepartmentId;

        var result = await controller.Delete(departmentId);

        Assert.IsType<NoContentResult>(result);
        Assert.Null(await db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == departmentId));

        var auditLog = await db.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == departmentId && a.Action == "DepartmentDeleted");
        Assert.NotNull(auditLog);
    }

    [Fact]
    public async Task Delete_DepartmentWithAssignedOfficer_IsBlocked()
    {
        using var db = CreateDb();
        var controller = CreateController(db);
        var department = new Department { Name = "In Use" };
        db.Departments.Add(department);
        db.OfficerProfiles.Add(new OfficerProfile { UserId = 42, Department = department, District = "Kandy" });
        await db.SaveChangesAsync();

        var result = await controller.Delete(department.DepartmentId);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
        Assert.NotNull(await db.Departments.FirstOrDefaultAsync(d => d.DepartmentId == department.DepartmentId));
    }
}
