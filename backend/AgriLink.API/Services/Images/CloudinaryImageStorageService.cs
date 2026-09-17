using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace AgriLink.API.Services.Images;

// Stores issue photos in Cloudinary as "authenticated" assets: they are not publicly reachable by
// URL, and can only be viewed through signed URLs the API generates for authorised users.
public class CloudinaryImageStorageService : IImageStorageService
{
    private const string FolderPrefix = "agrilink/issues";
    private const string DeliveryType = "authenticated";

    private readonly Cloudinary _cloudinary;

    public CloudinaryImageStorageService(CloudinaryOptions options)
    {
        if (!options.IsConfigured)
        {
            throw new ArgumentException("Cloudinary credentials are not fully configured.", nameof(options));
        }

        _cloudinary = new Cloudinary(new Account(options.CloudName, options.ApiKey, options.ApiSecret));
    }

    public async Task<string> SaveAsync(byte[] content, string contentType, CancellationToken cancellationToken)
    {
        var id = Guid.NewGuid().ToString("N");
        using var stream = new MemoryStream(content, writable: false);

        ImageUploadResult result;
        try
        {
            result = await _cloudinary.UploadAsync(
                new ImageUploadParams
                {
                    File = new FileDescription(id, stream),
                    // The folder goes into the public id itself rather than the Folder parameter,
                    // whose meaning differs between Cloudinary's fixed and dynamic folder modes.
                    PublicId = $"{FolderPrefix}/{id}",
                    Type = DeliveryType,
                    Overwrite = false,
                    UseFilename = false,
                    UniqueFilename = false,
                },
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ImageStorageException("Uploading the photo to Cloudinary failed.", ex);
        }

        if (result.Error is not null || string.IsNullOrEmpty(result.PublicId))
        {
            // Cloudinary's error message describes the request, never the credentials.
            throw new ImageStorageException($"Cloudinary rejected the photo upload: {result.Error?.Message ?? "no public id returned"}.");
        }

        return result.PublicId;
    }

    public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        DeletionResult result;
        try
        {
            result = await _cloudinary.DestroyAsync(new DeletionParams(storageKey)
            {
                Type = DeliveryType,
                ResourceType = ResourceType.Image,
                Invalidate = true,
            });
        }
        catch (Exception ex)
        {
            throw new ImageStorageException("Deleting the photo from Cloudinary failed.", ex);
        }

        // "not found" means it is already gone, which is what the caller wanted.
        if (result.Error is not null || result.Result is not ("ok" or "not found"))
        {
            throw new ImageStorageException($"Cloudinary could not delete the photo: {result.Error?.Message ?? result.Result}.");
        }
    }
}
