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

    /// <summary>
    /// Below this colour spread (the largest standard deviation of the red, green and blue values,
    /// 0–255) a photo is effectively one flat colour: a lens cap, a blank screenshot, a white page.
    /// Even a plain, evenly lit green leaf measures about 8, and a reported one far more: brown or
    /// yellow spots differ from green in red far more than in brightness, which is why this doesn't
    /// measure brightness alone. The classifier still named a disease for flat photos: a blank white
    /// image came back as tomato yellow leaf curl virus at 74%.
    /// </summary>
    public const double MinColourSpread = 3.0;

    public ProcessedPhoto Process(byte[] upload)
    {
        using var upright = PhotoDecoding.DecodeUpright(upload, MaxUploadBytes);
        using var resized = ResizeToFit(upright, MaxOutputLongSide);
        var output = resized ?? upright;

        if (ColourSpread(output) < MinColourSpread)
        {
            throw new InvalidPhotoException("This photo looks blank. Take a clear, close-up photo of the affected leaves.");
        }

        using var encoded = output.Encode(SKEncodedImageFormat.Jpeg, JpegQuality)
            ?? throw new InvalidOperationException("Encoding the processed photo as JPEG failed.");

        return new ProcessedPhoto(encoded.ToArray(), OutputContentType, output.Width, output.Height);
    }

    /// <summary>
    /// The largest per-channel standard deviation of the pixel colours, sampled on a grid of up to
    /// 64 × 64 points.
    /// </summary>
    private static double ColourSpread(SKBitmap bitmap)
    {
        const int grid = 64;
        var stepX = Math.Max(1, bitmap.Width / grid);
        var stepY = Math.Max(1, bitmap.Height / grid);
        var sums = new double[3];
        var squares = new double[3];
        var count = 0;
        for (var y = stepY / 2; y < bitmap.Height; y += stepY)
        {
            for (var x = stepX / 2; x < bitmap.Width; x += stepX)
            {
                var pixel = bitmap.GetPixel(x, y);
                ReadOnlySpan<double> channels = [pixel.Red, pixel.Green, pixel.Blue];
                for (var c = 0; c < 3; c++)
                {
                    sums[c] += channels[c];
                    squares[c] += channels[c] * channels[c];
                }

                count++;
            }
        }

        var spread = 0.0;
        for (var c = 0; c < 3; c++)
        {
            var mean = sums[c] / count;
            spread = Math.Max(spread, Math.Sqrt(Math.Max(0, (squares[c] / count) - (mean * mean))));
        }

        return spread;
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
