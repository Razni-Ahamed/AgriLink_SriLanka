using AgriLink.API.Services.Images;
using SkiaSharp;

namespace AgriLink.API.Tests.Services;

public class IssuePhotoProcessorTests
{
    private readonly IssuePhotoProcessor _processor = new();

    private static byte[] EncodePng(int width, int height, SKColor color)
    {
        using var bitmap = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.Erase(color);
        using var data = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    [Fact]
    public void Process_PngUpload_IsReencodedAsJpegWithSameDimensions()
    {
        var result = _processor.Process(EncodePng(200, 100, SKColors.Green));

        Assert.Equal("image/jpeg", result.ContentType);
        Assert.Equal(new byte[] { 0xFF, 0xD8, 0xFF }, result.Content.Take(3));
        Assert.Equal(200, result.Width);
        Assert.Equal(100, result.Height);
    }

    [Fact]
    public void Process_LargePhoto_IsDownscaledToTheMaximumLongSide()
    {
        var result = _processor.Process(EncodePng(3200, 1000, SKColors.Green));

        Assert.Equal(IssuePhotoProcessor.MaxOutputLongSide, result.Width);
        Assert.Equal(500, result.Height);
    }

    [Fact]
    public void Process_TransparentPng_IsFlattenedOntoWhite()
    {
        var result = _processor.Process(EncodePng(20, 20, SKColors.Transparent));

        using var decoded = SKBitmap.Decode(result.Content);
        var pixel = decoded.GetPixel(10, 10);
        Assert.True(pixel.Red > 245 && pixel.Green > 245 && pixel.Blue > 245, $"Expected white, got {pixel}.");
    }

    [Fact]
    public void Process_TextFileRenamedAsImage_IsRejected()
    {
        Assert.Throws<InvalidPhotoException>(() => _processor.Process("definitely not a photo"u8.ToArray()));
    }

    [Fact]
    public void Process_GifUpload_IsRejected()
    {
        var gifHeader = "GIF89a"u8.ToArray().Concat(new byte[32]).ToArray();

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(gifHeader));
    }

    [Fact]
    public void Process_JpegSignatureWithCorruptBody_IsRejected()
    {
        var corrupt = new byte[] { 0xFF, 0xD8, 0xFF }.Concat(new byte[64]).ToArray();

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(corrupt));
    }

    [Fact]
    public void Process_EmptyUpload_IsRejected()
    {
        Assert.Throws<InvalidPhotoException>(() => _processor.Process(Array.Empty<byte>()));
    }

    [Fact]
    public void Process_UploadOverTheSizeLimit_IsRejected()
    {
        var tooLarge = new byte[IssuePhotoProcessor.MaxUploadBytes + 1];

        Assert.Throws<InvalidPhotoException>(() => _processor.Process(tooLarge));
    }

    // A 2x1 source: red on the left, blue on the right.
    private static SKBitmap RedThenBlue()
    {
        var bitmap = new SKBitmap(2, 1, SKColorType.Rgba8888, SKAlphaType.Premul);
        bitmap.SetPixel(0, 0, SKColors.Red);
        bitmap.SetPixel(1, 0, SKColors.Blue);
        return bitmap;
    }

    [Fact]
    public void Orient_RightTop_RotatesClockwise()
    {
        using var source = RedThenBlue();
        using var result = PhotoDecoding.Orient(source, SKEncodedOrigin.RightTop);

        Assert.Equal((1, 2), (result.Width, result.Height));
        Assert.Equal(SKColors.Red, result.GetPixel(0, 0));
        Assert.Equal(SKColors.Blue, result.GetPixel(0, 1));
    }

    [Fact]
    public void Orient_LeftBottom_RotatesCounterClockwise()
    {
        using var source = RedThenBlue();
        using var result = PhotoDecoding.Orient(source, SKEncodedOrigin.LeftBottom);

        Assert.Equal((1, 2), (result.Width, result.Height));
        Assert.Equal(SKColors.Blue, result.GetPixel(0, 0));
        Assert.Equal(SKColors.Red, result.GetPixel(0, 1));
    }

    [Fact]
    public void Orient_TopRight_MirrorsHorizontally()
    {
        using var source = RedThenBlue();
        using var result = PhotoDecoding.Orient(source, SKEncodedOrigin.TopRight);

        Assert.Equal((2, 1), (result.Width, result.Height));
        Assert.Equal(SKColors.Blue, result.GetPixel(0, 0));
        Assert.Equal(SKColors.Red, result.GetPixel(1, 0));
    }

    [Fact]
    public void Orient_TopLeft_LeavesPixelsInPlace()
    {
        using var source = RedThenBlue();
        using var result = PhotoDecoding.Orient(source, SKEncodedOrigin.TopLeft);

        Assert.Equal(SKColors.Red, result.GetPixel(0, 0));
        Assert.Equal(SKColors.Blue, result.GetPixel(1, 0));
    }
}
