namespace AgriLink.API.DTOs.Issues;

/// <summary>
/// The multipart/form-data form of <see cref="CreateCropIssueRequest"/>. The photo is optional —
/// a report submitted this way without one is handled exactly like a JSON report.
/// </summary>
public class CreateCropIssueWithPhotoRequest : CreateCropIssueRequest
{
    public IFormFile? Photo { get; set; }
}
