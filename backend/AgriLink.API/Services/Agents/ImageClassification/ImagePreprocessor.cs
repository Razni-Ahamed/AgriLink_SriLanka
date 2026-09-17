using AgriLink.API.Services.Images;
using SkiaSharp;

namespace AgriLink.API.Services.Agents.ImageClassification;

/// <summary>
/// Turns a photo into the model's input tensor. Must match <c>eval_transform</c> in
/// <c>agrilink_ml/train.py</c> — the model only performs as evaluated if it sees photos prepared the
/// same way. <c>ImagePreprocessorParityTests</c> checks this against numbers produced by Python.
/// </summary>
public static class ImagePreprocessor
{
    /// <summary>Returns a CHW float tensor of <paramref name="input"/>'s size.</summary>
    public static float[] ToTensor(byte[] image, ModelInputSpec input)
    {
        var (rgb, width, height) = DecodeRgb(image);
        var resized = PilBilinearResampler.Resize(rgb, width, height, channels: 3, input.Width, input.Height);

        var plane = input.Width * input.Height;
        var tensor = new float[3 * plane];
        for (var i = 0; i < plane; i++)
        {
            for (var channel = 0; channel < 3; channel++)
            {
                var value = resized[i * 3 + channel] * input.Scale;
                tensor[channel * plane + i] = (float)((value - input.Mean[channel]) / input.Std[channel]);
            }
        }

        return tensor;
    }

    // Decodes to upright 8-bit RGB. Transparent pixels are composited onto white, as the upload
    // processor does, since training photos never had transparency.
    private static (byte[] Rgb, int Width, int Height) DecodeRgb(byte[] image)
    {
        using var stream = new MemoryStream(image, writable: false);
        using var codec = SKCodec.Create(stream)
            ?? throw new InvalidDataException("The photo could not be decoded for classification.");
        using var decoded = SKBitmap.Decode(codec)
            ?? throw new InvalidDataException("The photo could not be decoded for classification.");
        using var upright = IssuePhotoProcessor.Orient(decoded, codec.EncodedOrigin);

        var info = new SKImageInfo(upright.Width, upright.Height, SKColorType.Rgba8888, SKAlphaType.Unpremul);
        using var rgba = new SKBitmap(info);
        if (!upright.CopyTo(rgba, SKColorType.Rgba8888))
        {
            throw new InvalidOperationException("Converting the photo to RGB failed.");
        }

        var source = rgba.GetPixelSpan();
        var rgb = new byte[upright.Width * upright.Height * 3];
        for (int pixel = 0, i = 0; i < rgb.Length; pixel += 4, i += 3)
        {
            rgb[i] = source[pixel];
            rgb[i + 1] = source[pixel + 1];
            rgb[i + 2] = source[pixel + 2];
        }

        return (rgb, upright.Width, upright.Height);
    }
}
