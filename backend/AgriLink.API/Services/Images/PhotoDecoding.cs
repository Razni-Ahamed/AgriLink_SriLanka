using SkiaSharp;

namespace AgriLink.API.Services.Images;

/// <summary>
/// The validation and decoding every uploaded photo goes through, whatever it is for (an issue report,
/// a profile picture). The browser-supplied file name and content type are never consulted: the bytes
/// have to carry a JPEG, PNG or WebP signature and actually decode, so SVG, GIF and anything merely
/// renamed to ".jpg" are refused.
/// </summary>
public static class PhotoDecoding
{
    // Guards against decompression bombs: a small file that declares enormous dimensions.
    private const long MaxSourcePixels = 50_000_000;

    /// <summary>
    /// Decodes <paramref name="upload"/> and returns it drawn upright per its EXIF orientation, on an
    /// opaque background. The caller owns (and disposes) the returned bitmap.
    /// </summary>
    /// <param name="rejectAnimated">Refuse multi-frame images (animated WebP), rather than silently
    /// keeping only the first frame.</param>
    /// <exception cref="InvalidPhotoException">The upload is not a photo this system accepts.</exception>
    public static SKBitmap DecodeUpright(byte[] upload, long maxUploadBytes, bool rejectAnimated = false)
    {
        if (upload.Length == 0)
        {
            throw new InvalidPhotoException("The photo file is empty.");
        }

        if (upload.Length > maxUploadBytes)
        {
            throw new InvalidPhotoException($"The photo is larger than {maxUploadBytes / (1024 * 1024)} MB.");
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

        if (rejectAnimated && codec.FrameCount > 1)
        {
            throw new InvalidPhotoException("Animated images are not accepted.");
        }

        using var decoded = SKBitmap.Decode(codec)
            ?? throw new InvalidPhotoException("The photo could not be read. It may be damaged.");

        return Orient(decoded, codec.EncodedOrigin);
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
