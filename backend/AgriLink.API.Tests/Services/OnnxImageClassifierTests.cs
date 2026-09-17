using AgriLink.API.Services.Agents.ImageClassification;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// Uses a tiny 3-class model (red / green / blue by average colour) exported the same way as real
/// crop models — see ml/tools/make_backend_fixtures.py — so loading, inference and class mapping are
/// tested without shipping a real model.
/// </summary>
public sealed class OnnxImageClassifierTests : IDisposable
{
    private static readonly string FixtureModels =
        Path.Combine(AppContext.BaseDirectory, "Fixtures", "ImageClassification", "models");

    private readonly List<string> _tempDirectories = new();

    public void Dispose()
    {
        foreach (var directory in _tempDirectories.Where(Directory.Exists))
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static OnnxImageClassifier Create(string directory, TimeSpan? timeout = null) =>
        new(directory, intraOpThreads: 1, timeout ?? TimeSpan.FromSeconds(10), NullLogger<OnnxImageClassifier>.Instance);

    private static byte[] SolidPng(SKColor color)
    {
        using var bitmap = new SKBitmap(64, 48);
        bitmap.Erase(color);
        using var data = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private string CopyOfFixtureModels(Action<string>? tamperWithTestCropFolder = null)
    {
        var root = Path.Combine(Path.GetTempPath(), "agrilink-models-tests", Guid.NewGuid().ToString("N"));
        _tempDirectories.Add(root);
        var target = Path.Combine(root, "testcrop");
        Directory.CreateDirectory(target);
        foreach (var file in Directory.EnumerateFiles(Path.Combine(FixtureModels, "testcrop")))
        {
            File.Copy(file, Path.Combine(target, Path.GetFileName(file)));
        }
        tamperWithTestCropFolder?.Invoke(target);
        return root;
    }

    [Fact]
    public void SupportsCrop_MatchesTheCropNameInModelJson_IgnoringCase()
    {
        using var classifier = Create(FixtureModels);

        Assert.True(classifier.SupportsCrop("TestCrop"));
        Assert.True(classifier.SupportsCrop(" testcrop "));
        Assert.False(classifier.SupportsCrop("Cassava"));
    }

    [Theory]
    [InlineData(255, 0, 0, "red_disease", 0.9)]
    [InlineData(0, 0, 255, "blue_disease", 0.5)]
    public async Task ClassifyAsync_RanksClassesAndReturnsTheTopClassThreshold(
        byte r, byte g, byte b, string expectedKey, double expectedThreshold)
    {
        using var classifier = Create(FixtureModels);

        var findings = await classifier.ClassifyAsync("TestCrop", SolidPng(new SKColor(r, g, b)), CancellationToken.None);

        Assert.Equal("testcrop-fixture", findings.ModelVersion);
        Assert.Equal(expectedKey, findings.Top.Key);
        Assert.True(findings.Top.Probability > 0.99);
        Assert.Equal(expectedThreshold, findings.AutoReleaseThreshold);
        Assert.Equal(3, findings.Predictions.Count);
        Assert.Equal(1.0, findings.Predictions.Sum(p => p.Probability), precision: 4);
    }

    [Fact]
    public async Task ClassifyAsync_ClassWithoutAThreshold_ReportsNull()
    {
        using var classifier = Create(FixtureModels);

        var findings = await classifier.ClassifyAsync("TestCrop", SolidPng(new SKColor(0, 255, 0)), CancellationToken.None);

        Assert.Equal("green_disease", findings.Top.Key);
        Assert.Null(findings.AutoReleaseThreshold);
    }

    [Fact]
    public async Task ClassifyAsync_UnsupportedCrop_Throws()
    {
        using var classifier = Create(FixtureModels);

        await Assert.ThrowsAsync<NotSupportedException>(
            () => classifier.ClassifyAsync("Cassava", SolidPng(SKColors.Red), CancellationToken.None));
    }

    [Fact]
    public void MissingModelsDirectory_LoadsNothing_WithoutThrowing()
    {
        using var classifier = Create(Path.Combine(Path.GetTempPath(), "agrilink-no-such-dir", Guid.NewGuid().ToString("N")));

        Assert.False(classifier.SupportsCrop("TestCrop"));
    }

    [Fact]
    public void ModelJsonTheBackendCannotHonour_IsSkipped()
    {
        var directory = CopyOfFixtureModels(folder =>
        {
            var path = Path.Combine(folder, "model.json");
            File.WriteAllText(path, File.ReadAllText(path).Replace("\"stretch\"", "\"center-crop\""));
        });

        using var classifier = Create(directory);

        Assert.False(classifier.SupportsCrop("TestCrop"));
    }

    [Fact]
    public void CorruptOnnxFile_IsSkipped()
    {
        var directory = CopyOfFixtureModels(folder => File.WriteAllText(Path.Combine(folder, "model.onnx"), "not a model"));

        using var classifier = Create(directory);

        Assert.False(classifier.SupportsCrop("TestCrop"));
    }
}
