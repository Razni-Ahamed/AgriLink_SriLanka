using AgriLink.API.Services.Images;
using SkiaSharp;

namespace AgriLink.API.Tests.Services;

public class ProfilePhotoProcessorTests
{
    private readonly ProfilePhotoProcessor _processor = new();

    private static byte[] Encode(SKBitmap bitmap, SKEncodedImageFormat format)
    {
        using var data = bitmap.Encode(format, 95);
        return data.ToArray();
    }

    private static byte[] SolidImage(int width, int height, SKColor color, SKEncodedImageFormat format = SKEncodedImageFormat.Png)
    {
        using var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(color);
        return Encode(bitmap, format);
    }

    /// <summary>
    /// Inserts an EXIF (APP1) segment right after the JPEG's start-of-image marker: an orientation tag,
    /// plus a recognisable marker string standing in for the GPS data a phone would embed.
    /// </summary>
    private static byte[] WithExif(byte[] jpeg, ushort orientation)
    {
        byte[] tiff =
        [
            (byte)'M', (byte)'M', 0, 42, 0, 0, 0, 8, // big-endian TIFF header, first IFD at offset 8
            0, 1, // one entry
            0x01, 0x12, 0, 3, 0, 0, 0, 1, (byte)(orientation >> 8), (byte)orientation, 0, 0, // Orientation, SHORT
            0, 0, 0, 0, // no next IFD
            .. "SECRET-GPS-6.9271N-79.8612E"u8,
        ];
        var payload = "Exif\0\0"u8.ToArray().Concat(tiff).ToArray();
        var length = payload.Length + 2;
        byte[] app1 = [0xFF, 0xE1, (byte)(length >> 8), (byte)length, .. payload];
        return [.. jpeg.Take(2), .. app1, .. jpeg.Skip(2)];
    }

    [Fact]
    public void Process_Photo_BecomesA512SquareJpeg()
    {
        var result = _processor.Process(SolidImage(800, 600, SKColors.ForestGreen));

        Assert.Equal("image/jpeg", result.ContentType);
        Assert.Equal(new byte[] { 0xFF, 0xD8, 0xFF }, result.Content.Take(3));
        using var decoded = SKBitmap.Decode(result.Content);
        Assert.Equal(512, decoded.Width);
        Assert.Equal(512, decoded.Height);
        Assert.Equal(512, result.Width);
        Assert.Equal(512, result.Height);
    }

    [Fact]
    public void Process_SmallButAllowedPhoto_IsScaledUpTo512()
    {
        var result = _processor.Process(SolidImage(128, 200, SKColors.ForestGreen));

        using var decoded = SKBitmap.Decode(result.Content);
        Assert.Equal(512, decoded.Width);
        Assert.Equal(512, decoded.Height);
    }

    [Fact]
    public void Process_WidePhoto_KeepsOnlyTheCentreSquare()
    {
        // Red | green | red, each 200 px wide: a centre crop keeps only the green.
        using var bitmap = new SKBitmap(600, 200, SKColorType.Rgba8888, SKAlphaType.Premul);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.Red);
            using var green = new SKPaint { Color = SKColors.Lime };
            canvas.DrawRect(200, 0, 200, 200, green);
        }

        var result = _processor.Process(Encode(bitmap, SKEncodedImageFormat.Png));

        using var decoded = SKBitmap.Decode(result.Content);
        foreach (var (x, y) in new[] { (8, 8), (503, 256), (256, 503), (256, 256) })
        {
            var pixel = decoded.GetPixel(x, y);
            Assert.True(pixel.Green > 200 && pixel.Red < 60, $"Expected green at ({x},{y}), got {pixel}.");
        }
    }

    [Fact]
    public void Process_JpegWithExif_OutputCarriesNoMetadata_AndIsUpright()
    {
        // 300 wide x 200 tall, tagged "rotate 90° clockwise" (orientation 6), with a fake GPS string.
        var withExif = WithExif(SolidImage(300, 200, SKColors.SkyBlue, SKEncodedImageFormat.Jpeg), orientation: 6);
        using (var codec = SKCodec.Create(new MemoryStream(withExif)))
        {
            Assert.Equal(SKEncodedOrigin.RightTop, codec.EncodedOrigin); // the fixture really carries EXIF
        }

        var result = _processor.Process(withExif);

        Assert.Equal(-1, result.Content.AsSpan().IndexOf("Exif\0\0"u8));
        Assert.Equal(-1, result.Content.AsSpan().IndexOf("SECRET-GPS"u8));
        using var outputCodec = SKCodec.Create(new MemoryStream(result.Content));
        Assert.Equal(SKEncodedOrigin.TopLeft, outputCodec.EncodedOrigin);
        Assert.Equal(512, outputCodec.Info.Width);
    }

    [Fact]
    public void Process_ShorterSideUnder128_IsRejected()
    {
        var ex = Assert.Throws<InvalidPhotoException>(() => _processor.Process(SolidImage(1000, 127, SKColors.Green)));
        Assert.Contains("128", ex.Message);
    }

    [Fact]
    public void Process_TextFile_IsRejected()
    {
        Assert.Throws<InvalidPhotoException>(() => _processor.Process("definitely not a photo"u8.ToArray()));
    }

    [Fact]
    public void Process_Svg_IsRejected()
    {
        var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"512\" height=\"512\"><script>alert(1)</script></svg>"u8.ToArray();

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(svg));
    }

    [Fact]
    public void Process_Gif_IsRejected()
    {
        var gif = "GIF89a"u8.ToArray().Concat(new byte[64]).ToArray();

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(gif));
    }

    [Fact]
    public void Process_JpegSignatureWithCorruptBody_IsRejected()
    {
        var corrupt = new byte[] { 0xFF, 0xD8, 0xFF }.Concat(new byte[256]).ToArray();

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(corrupt));
    }

    [Fact]
    public void Process_EmptyUpload_IsRejected()
    {
        Assert.Throws<InvalidPhotoException>(() => _processor.Process(Array.Empty<byte>()));
    }

    [Fact]
    public void Process_UploadOverFiveMegabytes_IsRejected()
    {
        var tooLarge = new byte[ProfilePhotoProcessor.MaxUploadBytes + 1];
        new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }.CopyTo(tooLarge, 0);

        var ex = Assert.Throws<InvalidPhotoException>(() => _processor.Process(tooLarge));
        Assert.Contains("5 MB", ex.Message);
    }
}
