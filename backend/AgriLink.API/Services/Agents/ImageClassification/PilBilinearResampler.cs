namespace AgriLink.API.Services.Agents.ImageClassification;

/// <summary>
/// A port of Pillow's <c>Image.resize(..., BILINEAR)</c> (libImaging/Resample.c), which is what
/// torchvision's <c>Resize</c> runs on the PIL images used in training. When shrinking, Pillow widens
/// the bilinear (triangle) filter by the scale factor, so every source pixel under an output pixel
/// contributes — an antialiased resize. SkiaSharp's linear+mipmap filtering only approximates that
/// and drifted by up to ~14/255 per channel, enough to shift model confidence near a threshold.
/// </summary>
public static class PilBilinearResampler
{
    private const int PrecisionBits = 32 - 8 - 2;

    /// <summary>Resizes interleaved 8-bit pixels (<paramref name="channels"/> per pixel).</summary>
    public static byte[] Resize(byte[] pixels, int width, int height, int channels, int outWidth, int outHeight)
    {
        var horizontal = outWidth == width ? pixels : ResampleHorizontal(pixels, width, height, channels, outWidth);
        return outHeight == height
            ? horizontal
            : ResampleVertical(horizontal, outWidth, height, channels, outHeight);
    }

    private static byte[] ResampleHorizontal(byte[] source, int width, int height, int channels, int outWidth)
    {
        var (bounds, weights, kernelSize) = Coefficients(width, outWidth);
        var output = new byte[outWidth * height * channels];
        for (var y = 0; y < height; y++)
        {
            var row = y * width;
            for (var x = 0; x < outWidth; x++)
            {
                var (min, count) = bounds[x];
                for (var c = 0; c < channels; c++)
                {
                    var sum = 1L << (PrecisionBits - 1);
                    for (var k = 0; k < count; k++)
                    {
                        sum += source[(row + min + k) * channels + c] * (long)weights[x * kernelSize + k];
                    }
                    output[(y * outWidth + x) * channels + c] = Clip8(sum);
                }
            }
        }
        return output;
    }

    private static byte[] ResampleVertical(byte[] source, int width, int height, int channels, int outHeight)
    {
        var (bounds, weights, kernelSize) = Coefficients(height, outHeight);
        var output = new byte[width * outHeight * channels];
        for (var y = 0; y < outHeight; y++)
        {
            var (min, count) = bounds[y];
            for (var x = 0; x < width; x++)
            {
                for (var c = 0; c < channels; c++)
                {
                    var sum = 1L << (PrecisionBits - 1);
                    for (var k = 0; k < count; k++)
                    {
                        sum += source[((min + k) * width + x) * channels + c] * (long)weights[y * kernelSize + k];
                    }
                    output[(y * width + x) * channels + c] = Clip8(sum);
                }
            }
        }
        return output;
    }

    // precompute_coeffs + normalize_coeffs_8bpc from Resample.c, for the bilinear filter (support 1).
    private static ((int Min, int Count)[] Bounds, int[] Weights, int KernelSize) Coefficients(int inSize, int outSize)
    {
        var scale = (double)inSize / outSize;
        var filterScale = Math.Max(scale, 1.0);
        var support = 1.0 * filterScale;
        var kernelSize = (int)Math.Ceiling(support) * 2 + 1;

        var bounds = new (int, int)[outSize];
        var weights = new int[outSize * kernelSize];
        var kernel = new double[kernelSize];

        for (var i = 0; i < outSize; i++)
        {
            var center = (i + 0.5) * scale;
            var min = Math.Max((int)(center - support + 0.5), 0);
            var max = Math.Min((int)(center + support + 0.5), inSize) - min;

            var total = 0.0;
            for (var k = 0; k < max; k++)
            {
                var w = Triangle((k + min - center + 0.5) / filterScale);
                kernel[k] = w;
                total += w;
            }

            for (var k = 0; k < max; k++)
            {
                var normalised = total != 0 ? kernel[k] / total : 0.0;
                weights[i * kernelSize + k] = normalised < 0
                    ? (int)(-0.5 + normalised * (1 << PrecisionBits))
                    : (int)(0.5 + normalised * (1 << PrecisionBits));
            }

            bounds[i] = (min, max);
        }

        return (bounds, weights, kernelSize);
    }

    private static double Triangle(double x)
    {
        x = Math.Abs(x);
        return x < 1.0 ? 1.0 - x : 0.0;
    }

    private static byte Clip8(long value)
    {
        var shifted = value >> PrecisionBits;
        return shifted < 0 ? (byte)0 : shifted > 255 ? (byte)255 : (byte)shifted;
    }
}
