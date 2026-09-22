using SkiaSharp;

namespace AgriLink.API.Services.Images;

public interface IProfilePhotoProcessor
{
    /// <exception cref="InvalidPhotoException">The upload is not a photo this system accepts.</exception>
    ProcessedPhoto Process(byte[] upload);
}

// Profile photos are public (anyone with the URL can load them), so what gets stored must carry
// nothing the user didn't mean to publish: re-encoding drops EXIF entirely, including the GPS
// position phones embed. Every avatar comes out the same square size, so the UI never has to cope
// with an odd shape and storage per user stays small.
public class ProfilePhotoProcessor : IProfilePhotoProcessor
{
    public const long MaxUploadBytes = 5 * 1024 * 1024;
    public const int MinSourceSide = 128;
    public const int OutputSize = 512;
    public const string OutputContentType = "image/jpeg";

    private const int JpegQuality = 85;

    public ProcessedPhoto Process(byte[] upload)
    {
        // Animated images are refused rather than frozen on their first frame: what the user saw in
        // their file browser should be what everyone else sees.
        using var upright = PhotoDecoding.DecodeUpright(upload, MaxUploadBytes, rejectAnimated: true);

        var side = Math.Min(upright.Width, upright.Height);
        if (side < MinSourceSide)
        {
            throw new InvalidPhotoException($"The photo must be at least {MinSourceSide} × {MinSourceSide} pixels.");
        }

        using var square = new SKBitmap();
        var crop = SKRectI.Create((upright.Width - side) / 2, (upright.Height - side) / 2, side, side);
        if (!upright.ExtractSubset(square, crop))
        {
            throw new InvalidOperationException("Cropping the photo failed.");
        }

        using var resized = square.Resize(
                new SKSizeI(OutputSize, OutputSize),
                new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
            ?? throw new InvalidOperationException("Resizing the photo failed.");

        using var encoded = resized.Encode(SKEncodedImageFormat.Jpeg, JpegQuality)
            ?? throw new InvalidOperationException("Encoding the processed photo as JPEG failed.");

        return new ProcessedPhoto(encoded.ToArray(), OutputContentType, OutputSize, OutputSize);
    }
}
