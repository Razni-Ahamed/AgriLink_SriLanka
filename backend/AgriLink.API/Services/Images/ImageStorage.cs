namespace AgriLink.API.Services.Images;

/// <summary>Stores issue photos outside the database.</summary>
public interface IImageStorageService
{
    /// <summary>Stores the image and returns the key to record in <c>IssueImage.StorageKey</c>.</summary>
    /// <exception cref="ImageStorageException">The provider could not store the image.</exception>
    Task<string> SaveAsync(byte[] content, string contentType, CancellationToken cancellationToken);

    /// <summary>Deletes a stored image. Deleting an image that no longer exists is not an error.</summary>
    /// <exception cref="ImageStorageException">The provider could not delete the image.</exception>
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken);
}

/// <summary>The storage provider failed. Callers treat this as a temporary outage, never as a
/// problem with the farmer's photo.</summary>
public class ImageStorageException : Exception
{
    public ImageStorageException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

public class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string? CloudName { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(CloudName) &&
        !string.IsNullOrWhiteSpace(ApiKey) &&
        !string.IsNullOrWhiteSpace(ApiSecret);
}

public class ImageStorageOptions
{
    public const string SectionName = "ImageStorage";

    /// <summary>Folder used when Cloudinary is not configured. Relative paths resolve against the
    /// app's content root; defaults to <c>App_Data/issue-images</c>.</summary>
    public string? LocalRoot { get; set; }
}
