using System.Text.RegularExpressions;

namespace AgriLink.API.Services.Images;

// Development fallback used when Cloudinary is not configured. Photos live on the API server's own
// disk and are served back by ProfilePhotosController, so they do not survive a redeploy to most
// hosts — not for production use.
public partial class LocalProfilePhotoStorage : IProfilePhotoStorage
{
    public const string ServePath = "/api/profile-photos";

    private readonly string _root;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LocalProfilePhotoStorage(string rootDirectory, IHttpContextAccessor httpContextAccessor)
    {
        _root = Path.GetFullPath(rootDirectory);
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<StoredProfilePhoto> SaveAsync(byte[] jpeg, CancellationToken cancellationToken)
    {
        var key = $"{Guid.NewGuid():N}.jpg";

        try
        {
            Directory.CreateDirectory(_root);
            await File.WriteAllBytesAsync(Path.Combine(_root, key), jpeg, cancellationToken);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new ImageStorageException("Saving the profile photo to local storage failed.", ex);
        }

        return new StoredProfilePhoto(key, UrlFor(key));
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        var path = PathFor(key) ?? throw new ArgumentException("Not a valid local profile photo key.", nameof(key));

        try
        {
            File.Delete(path); // no-op when the file is already gone
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new ImageStorageException("Deleting the profile photo from local storage failed.", ex);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// The file behind <paramref name="fileName"/>, or null unless the name is exactly the shape
    /// <see cref="SaveAsync"/> produces. The name comes from the request URL, so this check is what
    /// keeps "../" and friends from reaching anything outside the storage folder.
    /// </summary>
    public string? PathFor(string? fileName) =>
        fileName is not null && FileNamePattern().IsMatch(fileName) ? Path.Combine(_root, fileName) : null;

    // Absolute, because the client only renders photo URLs it can load as-is. The browser only shows
    // these when the API is served over https (the "https" launch profile).
    private string UrlFor(string key)
    {
        var request = _httpContextAccessor.HttpContext?.Request;
        return request is null
            ? $"{ServePath}/{key}"
            : $"{request.Scheme}://{request.Host}{request.PathBase}{ServePath}/{key}";
    }

    [GeneratedRegex(@"^[0-9a-f]{32}\.jpg\z", RegexOptions.CultureInvariant)]
    private static partial Regex FileNamePattern();
}
