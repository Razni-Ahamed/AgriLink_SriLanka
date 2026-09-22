namespace AgriLink.API.Services.Images;

/// <summary>A stored profile photo: <see cref="Key"/> deletes it later, <see cref="Url"/> is what browsers load.</summary>
public record StoredProfilePhoto(string Key, string Url);

/// <summary>
/// Stores profile photos where browsers can load them straight from a URL. Unlike issue photos
/// (<see cref="IImageStorageService"/>), which only the API may read, avatars are shown to other
/// users next to names, so they are deliberately public.
/// </summary>
public interface IProfilePhotoStorage
{
    /// <summary>Stores an already-processed JPEG under a name this service picks.</summary>
    /// <exception cref="ImageStorageException">The provider could not store the photo.</exception>
    Task<StoredProfilePhoto> SaveAsync(byte[] jpeg, CancellationToken cancellationToken);

    /// <summary>Deletes a stored photo. Deleting one that no longer exists is not an error.</summary>
    /// <exception cref="ImageStorageException">The provider could not delete the photo.</exception>
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
