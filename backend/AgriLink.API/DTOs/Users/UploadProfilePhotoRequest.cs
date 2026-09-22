namespace AgriLink.API.DTOs.Users;

/// <summary>The multipart/form-data body of POST /api/users/me/photo: the image in a "photo" field.</summary>
public class UploadProfilePhotoRequest
{
    public IFormFile? Photo { get; set; }
}
