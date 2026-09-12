using AgriLink.API.Data;
using Microsoft.AspNetCore.Mvc;

namespace AgriLink.API.Controllers;

/// <summary>
/// Public — the farmer self-registration form needs this list before the visitor has an
/// account, so it can't sit behind [Authorize] the way the rest of the admin lookups do.
/// </summary>
[ApiController]
[Route("api/districts")]
public class DistrictsController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<string>> GetAll() => Ok(SriLankaDistricts.All.ToList());
}
