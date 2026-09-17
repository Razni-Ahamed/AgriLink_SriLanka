namespace AgriLink.API.Models;

/// <summary>
/// A photo attached to a crop issue. Only the storage reference lives in the database — the image
/// bytes are kept in object storage (Cloudinary, or a local folder in development), so photos
/// never bloat the Postgres database or its backups.
/// </summary>
public class IssueImage
{
    public int ImageId { get; set; }
    public int IssueId { get; set; }

    /// <summary>The key the storage provider knows this image by — a Cloudinary public id, or a
    /// path relative to the local storage root.</summary>
    public string StorageKey { get; set; } = string.Empty;

    /// <summary>Content type of the stored file. Uploads are re-encoded before storage, so this
    /// describes what was saved, not what the farmer's device sent.</summary>
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public CropIssue Issue { get; set; } = null!;
}
