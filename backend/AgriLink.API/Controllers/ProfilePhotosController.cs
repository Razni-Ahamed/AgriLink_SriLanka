using AgriLink.API.Services.Images;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriLink.API.Controllers;

/// <summary>
/// Serves profile photos kept on local disk in development. Anonymous because an &lt;img&gt; request
/// carries no bearer token, matching Cloudinary's public delivery in production. With Cloudinary
/// configured there is nothing here to serve and every request is a 404.
/// </summary>
[ApiController]
[Route("api/profile-photos")]
[AllowAnonymous]
public class ProfilePhotosController : ControllerBase
{
    private readonly IProfilePhotoStorage _storage;

    public ProfilePhotosController(IProfilePhotoStorage storage)
    {
        _storage = storage;
    }

    [HttpGet("{fileName}")]
    public IActionResult Get(string fileName)
    {
        var path = (_storage as LocalProfilePhotoStorage)?.PathFor(fileName);
        if (path is null || !System.IO.File.Exists(path))
        {
            return NotFound();
        }

        // The body is always a JPEG this API wrote, but tell the browser not to second-guess that.
        Response.Headers.XContentTypeOptions = "nosniff";
        // Each file name is a fresh random id that is never reused, so the bytes behind it never change.
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return PhysicalFile(path, ProfilePhotoProcessor.OutputContentType);
    }
}
