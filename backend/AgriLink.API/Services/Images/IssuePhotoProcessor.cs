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

    // Guards against decompression bombs: a small file that declares enormous dimensions.
    private const long MaxSourcePixels = 50_000_000;
    private const int JpegQuality = 85;

    public ProcessedPhoto Process(byte[] upload)
    {
        if (upload.Length == 0)
        {
            throw new InvalidPhotoException("The photo file is empty.");
        }

        if (upload.Length > MaxUploadBytes)
        {
            throw new InvalidPhotoException("The photo is larger than 5 MB.");
        }

        if (!HasAcceptedSignature(upload))
        {
            throw new InvalidPhotoException("Only JPEG, PNG or WebP photos are accepted.");
        }

        using var input = new MemoryStream(upload, writable: false);
        using var codec = SKCodec.Create(input)
            ?? throw new InvalidPhotoException("The photo could not be read. It may be damaged.");

        var info = codec.Info;
        if (info.Width <= 0 || info.Height <= 0 || (long)info.Width * info.Height > MaxSourcePixels)
        {
            throw new InvalidPhotoException("The photo's dimensions are not supported.");
        }

        using var decoded = SKBitmap.Decode(codec)
            ?? throw new InvalidPhotoException("The photo could not be read. It may be damaged.");

        using var upright = Orient(decoded, codec.EncodedOrigin);
        using var resized = ResizeToFit(upright, MaxOutputLongSide);
        var output = resized ?? upright;

        using var encoded = output.Encode(SKEncodedImageFormat.Jpeg, JpegQuality)
            ?? throw new InvalidOperationException("Encoding the processed photo as JPEG failed.");

        return new ProcessedPhoto(encoded.ToArray(), OutputContentType, output.Width, output.Height);
    }

    /// <summary>
    /// Redraws <paramref name="source"/> the way its EXIF origin says it should be displayed, onto
    /// an opaque white background (JPEG has no transparency, so a transparent PNG would otherwise
    /// turn black).
    /// </summary>
    public static SKBitmap Orient(SKBitmap source, SKEncodedOrigin origin)
    {
        var swapsSides = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
            or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var width = swapsSides ? source.Height : source.Width;
        var height = swapsSides ? source.Width : source.Height;

        var result = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        using var canvas = new SKCanvas(result);
        canvas.Clear(SKColors.White);

        switch (origin)
        {
            case SKEncodedOrigin.TopRight: // mirrored horizontally
                canvas.Translate(width, 0);
                canvas.Scale(-1, 1);
                break;
            case SKEncodedOrigin.BottomRight: // rotated 180°
                canvas.Translate(width, height);
                canvas.RotateDegrees(180);
                break;
            case SKEncodedOrigin.BottomLeft: // mirrored vertically
                canvas.Translate(0, height);
                canvas.Scale(1, -1);
                break;
            case SKEncodedOrigin.LeftTop: // transposed
                canvas.RotateDegrees(90);
                canvas.Scale(1, -1);
                break;
            case SKEncodedOrigin.RightTop: // needs 90° clockwise
                canvas.Translate(width, 0);
                canvas.RotateDegrees(90);
                break;
            case SKEncodedOrigin.RightBottom: // transverse
                canvas.Translate(width, height);
                canvas.RotateDegrees(-90);
                canvas.Scale(1, -1);
                break;
            case SKEncodedOrigin.LeftBottom: // needs 90° counter-clockwise
                canvas.Translate(0, height);
                canvas.RotateDegrees(-90);
                break;
        }

        canvas.DrawBitmap(source, 0, 0);
        return result;
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

    private static bool HasAcceptedSignature(ReadOnlySpan<byte> bytes)
    {
        ReadOnlySpan<byte> jpeg = [0xFF, 0xD8, 0xFF];
        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        ReadOnlySpan<byte> riff = "RIFF"u8;
        ReadOnlySpan<byte> webp = "WEBP"u8;

        return bytes.StartsWith(jpeg)
            || bytes.StartsWith(png)
            || (bytes.Length >= 12 && bytes.StartsWith(riff) && bytes.Slice(8, 4).SequenceEqual(webp));
    }
}
