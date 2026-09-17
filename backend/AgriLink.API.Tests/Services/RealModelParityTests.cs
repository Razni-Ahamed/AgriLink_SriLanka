using System.Text.Json;
using AgriLink.API.Services.Agents.ImageClassification;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit.Abstractions;

namespace AgriLink.API.Tests.Services;

/// <summary>
/// Optional check after training a model: the backend must reproduce Python's predictions on real
/// photos. Skipped unless AGRILINK_MODEL_PARITY_DIR points at a folder of photos plus an
/// expected.json written by Python (see "Checking a model in the backend" in ml/README.md). The
/// models are read from the repo's ml/models, where training writes them — neither the photos nor
/// the models are committed.
/// </summary>
public class RealModelParityTests
{
    private const string ParityDirVariable = "AGRILINK_MODEL_PARITY_DIR";
    private const string ParityCropVariable = "AGRILINK_MODEL_PARITY_CROP";

    private readonly ITestOutputHelper _output;

    public RealModelParityTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [SkippableFact]
    public async Task BackendPredictions_MatchPython_OnRealPhotos()
    {
        var parityDir = Environment.GetEnvironmentVariable(ParityDirVariable);
        Skip.If(string.IsNullOrWhiteSpace(parityDir), $"Set {ParityDirVariable} to run this check.");
        var crop = Environment.GetEnvironmentVariable(ParityCropVariable) ?? "Cassava";

        var modelsDir = FindRepoModelsDirectory();
        Skip.If(modelsDir is null, "ml/models was not found above the test output folder.");

        using var classifier = new OnnxImageClassifier(modelsDir!, intraOpThreads: 4, TimeSpan.FromSeconds(30),
            NullLogger<OnnxImageClassifier>.Instance);
        Assert.True(classifier.SupportsCrop(crop), $"No model for {crop} in {modelsDir}.");

        using var expected = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(parityDir!, "expected.json")));
        var photos = 0;
        var sameTopClass = 0;
        var worstDifference = 0.0;
        foreach (var photo in expected.RootElement.EnumerateObject())
        {
            var pythonProbabilities = photo.Value.GetProperty("probabilities").EnumerateArray().Select(p => p.GetDouble()).ToArray();
            var findings = await classifier.ClassifyAsync(crop, await File.ReadAllBytesAsync(Path.Combine(parityDir!, photo.Name)), CancellationToken.None);

            // Python's probabilities are in class-id order; the backend's are ranked. model.json maps
            // one onto the other, and class ids follow the order classes appear in it.
            var metadata = ModelMetadata.Parse(await File.ReadAllTextAsync(Path.Combine(modelsDir!, crop.ToLowerInvariant(), "model.json")));
            var backendById = metadata.Classes.ToDictionary(c => c.Id, c => findings.Predictions.Single(p => p.Key == c.Key).Probability);

            var pythonTop = Array.IndexOf(pythonProbabilities, pythonProbabilities.Max());
            if (metadata.Classes.Single(c => c.Id == pythonTop).Key == findings.Top.Key)
            {
                sameTopClass++;
            }

            if (photos == 0)
            {
                _output.WriteLine($"{photo.Name}: python [{string.Join(", ", pythonProbabilities.Select(p => p.ToString("F6")))}] backend [{string.Join(", ", metadata.Classes.OrderBy(c => c.Id).Select(c => backendById[c.Id].ToString("F6")))}]");
            }

            worstDifference = Math.Max(worstDifference, pythonProbabilities.Select((p, id) => Math.Abs(p - backendById[id])).Max());
            photos++;
        }

        _output.WriteLine($"{crop}: {photos} photos, same top class for {sameTopClass}, largest probability difference {worstDifference:E2}.");
        Assert.True(photos > 0, "expected.json listed no photos.");
        Assert.Equal(photos, sameTopClass);
        // JPEG decoders (SkiaSharp vs Pillow) may differ by a level here and there; anything beyond a
        // few percent means the backend is not feeding the model what training evaluated.
        Assert.True(worstDifference < 0.03, $"Largest probability difference from Python: {worstDifference:F4} across {photos} photos.");
    }

    private static string? FindRepoModelsDirectory()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "ml", "models");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }
        }
        return null;
    }
}
