using AgriLink.API.Data;
using Microsoft.AspNetCore.Mvc;

namespace AgriLink.API.Controllers;

/// <summary>
/// Public, for the same reason DistrictsController is: the marketplace browse page filters by
/// crop type and the backend serves that page to anonymous visitors, so the filter's options
/// have to be fetchable without a token.
/// </summary>
[ApiController]
[Route("api/crop-types")]
public class CropTypesController : ControllerBase
{
    [HttpGet]
    public ActionResult<List<string>> GetAll() => Ok(CropTypes.All.ToList());
}
