using AgriLink.API.Services.Agents.ImageClassification;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// The backend must prepare photos the way training evaluated them. The expected tensor was
/// produced by agrilink_ml.train.eval_transform in Python (see ml/tools/make_backend_fixtures.py).
/// </summary>
public class ImagePreprocessorParityTests
{
    private const int Size = 96;

    private static readonly string FixtureDir =
        Path.Combine(AppContext.BaseDirectory, "Fixtures", "ImageClassification", "preprocessing");

    private static readonly ModelInputSpec Input = new()
    {
        Layout = "NCHW",
        Width = Size,
        Height = Size,
        ColorOrder = "RGB",
        Resize = "stretch",
        Interpolation = "bilinear",
        Scale = 1.0 / 255,
        Mean = new[] { 0.485, 0.456, 0.406 },
        Std = new[] { 0.229, 0.224, 0.225 },
    };

    [Fact]
    public void ToTensor_MatchesTheTrainingPipelineOutput()
    {
        var expectedBytes = File.ReadAllBytes(Path.Combine(FixtureDir, $"expected-{Size}.bin"));
        var expected = new float[expectedBytes.Length / sizeof(float)];
        Buffer.BlockCopy(expectedBytes, 0, expected, 0, expectedBytes.Length);

        var actual = ImagePreprocessor.ToTensor(File.ReadAllBytes(Path.Combine(FixtureDir, "source.png")), Input);

        Assert.Equal(expected.Length, actual.Length);
        var differences = expected.Zip(actual, (e, a) => Math.Abs(e - a)).ToArray();
        // Normalised units. One 8-bit brightness level is 1/255/std, at most ~0.0175 (blue channel):
        // the port of Pillow's resize should agree to within a level, from rounding alone.
        var mean = differences.Average();
        var max = differences.Max();
        Assert.True(mean < 0.001 && max <= 0.0176, $"Preprocessing drifted from training: mean {mean:F4}, max {max:F4}.");
    }
}
