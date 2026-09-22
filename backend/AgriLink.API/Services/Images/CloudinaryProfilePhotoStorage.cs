using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace AgriLink.API.Services.Images;

// Public "upload" delivery, on purpose: avatars appear next to names across the app, so browsers load
// them directly by URL. Issue photos stay private "authenticated" assets in CloudinaryImageStorageService.
public class CloudinaryProfilePhotoStorage : IProfilePhotoStorage
{
    private const string FolderPrefix = "agrilink/avatars";
    private const string DeliveryType = "upload";

    private readonly Cloudinary _cloudinary;

    public CloudinaryProfilePhotoStorage(CloudinaryOptions options)
    {
        if (!options.IsConfigured)
        {
            throw new ArgumentException("Cloudinary credentials are not fully configured.", nameof(options));
        }

        _cloudinary = new Cloudinary(new Account(options.CloudName, options.ApiKey, options.ApiSecret));
    }

    public async Task<StoredProfilePhoto> SaveAsync(byte[] jpeg, CancellationToken cancellationToken)
    {
        // A fresh random id per upload: the URL can't be guessed from the user, and a replaced photo
        // gets a new URL, so no browser or CDN keeps showing the old one from cache.
        var id = Guid.NewGuid().ToString("N");
        using var stream = new MemoryStream(jpeg, writable: false);

        ImageUploadResult result;
        try
        {
            result = await _cloudinary.UploadAsync(
                new ImageUploadParams
                {
                    File = new FileDescription($"{id}.jpg", stream),
                    // As in CloudinaryImageStorageService: the folder goes into the public id rather than
                    // the Folder parameter, whose meaning differs between fixed and dynamic folder modes.
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
            throw new ImageStorageException("Uploading the profile photo to Cloudinary failed.", ex);
        }

        var url = result.SecureUrl;
        if (result.Error is not null || string.IsNullOrEmpty(result.PublicId) || url is null || url.Scheme != Uri.UriSchemeHttps)
        {
            // Cloudinary's error message describes the request, never the credentials.
            throw new ImageStorageException($"Cloudinary rejected the profile photo upload: {result.Error?.Message ?? "no secure URL returned"}.");
        }

        return new StoredProfilePhoto(result.PublicId, url.AbsoluteUri);
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        DeletionResult result;
        try
        {
            result = await _cloudinary.DestroyAsync(new DeletionParams(key)
            {
                Type = DeliveryType,
                ResourceType = ResourceType.Image,
                // Also purges CDN copies, so a removed photo stops loading everywhere.
                Invalidate = true,
            });
        }
        catch (Exception ex)
        {
            throw new ImageStorageException("Deleting the profile photo from Cloudinary failed.", ex);
        }

        if (result.Error is not null || result.Result is not ("ok" or "not found"))
        {
            throw new ImageStorageException($"Cloudinary could not delete the profile photo: {result.Error?.Message ?? result.Result}.");
        }
    }
}
