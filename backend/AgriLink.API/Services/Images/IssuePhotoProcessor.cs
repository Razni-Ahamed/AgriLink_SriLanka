using SkiaSharp;

namespace AgriLink.API.Services.Images;

/// <summary>A farmer's photo after validation and normalisation, ready to store.</summary>
public record ProcessedPhoto(byte[] Content, string ContentType, int Width, int Height);

/// <summary>The uploaded file is not a photo this system accepts. The message is safe to show
/// the farmer.</summary>
public class InvalidPhotoException : Exception
{
    public InvalidPhotoException(string message) : base(message)
    {
    }
}

public interface IIssuePhotoProcessor
{
    ProcessedPhoto Process(byte[] upload);
}

// Every upload is decoded and re-encoded rather than stored as sent. That one step:
//  - proves the file really is an image (the browser-supplied content type is never trusted),
//  - applies the phone's EXIF rotation so the officer and the classifier see the photo upright,
//  - drops all metadata, including the GPS coordinates phones embed in photos,
//  - caps the size, so storage and classification cost stay predictable.
public class IssuePhotoProcessor : IIssuePhotoProcessor
{
    public const long MaxUploadBytes = 5 * 1024 * 1024;
    public const int MaxOutputLongSide = 1600;
    public const string OutputContentType = "image/jpeg";

    private const int JpegQuality = 85;

    public ProcessedPhoto Process(byte[] upload)
    {
        using var upright = PhotoDecoding.DecodeUpright(upload, MaxUploadBytes);
        using var resized = ResizeToFit(upright, MaxOutputLongSide);
        var output = resized ?? upright;

        using var encoded = output.Encode(SKEncodedImageFormat.Jpeg, JpegQuality)
            ?? throw new InvalidOperationException("Encoding the processed photo as JPEG failed.");

        return new ProcessedPhoto(encoded.ToArray(), OutputContentType, output.Width, output.Height);
    }

    /// <summary>Returns a downscaled copy when the longest side exceeds
    /// <paramref name="maxLongSide"/>, or null when the bitmap already fits.</summary>
    private static SKBitmap? ResizeToFit(SKBitmap bitmap, int maxLongSide)
    {
        var longSide = Math.Max(bitmap.Width, bitmap.Height);
        if (longSide <= maxLongSide)
        {
            return null;
        }

        var scale = (double)maxLongSide / longSide;
        var size = new SKSizeI(
            Math.Max(1, (int)Math.Round(bitmap.Width * scale)),
            Math.Max(1, (int)Math.Round(bitmap.Height * scale)));

        return bitmap.Resize(size, new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
            ?? throw new InvalidOperationException("Resizing the photo failed.");
    }
}
