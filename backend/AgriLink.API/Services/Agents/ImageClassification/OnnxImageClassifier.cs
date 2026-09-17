using Microsoft.ML.OnnxRuntime;

namespace AgriLink.API.Services.Agents.ImageClassification;

public record ClassPrediction(string Key, string Name, double Probability);

/// <summary>What the model saw in one photo.</summary>
public record ImageFindings
{
    public string Crop { get; init; } = string.Empty;
    public string ModelVersion { get; init; } = string.Empty;

    /// <summary>Every class, most probable first.</summary>
    public IReadOnlyList<ClassPrediction> Predictions { get; init; } = Array.Empty<ClassPrediction>();

    /// <summary>The top class's auto-release threshold from model.json; null means never.</summary>
    public double? AutoReleaseThreshold { get; init; }

    public ClassPrediction Top => Predictions[0];
}

public interface IImageClassifier
{
    bool SupportsCrop(string cropType);

    /// <exception cref="NotSupportedException">No model is loaded for the crop.</exception>
    /// <exception cref="TimeoutException">Classification took longer than configured.</exception>
    Task<ImageFindings> ClassifyAsync(string cropType, byte[] image, CancellationToken cancellationToken);
}

/// <summary>
/// Runs the per-crop ONNX models exported by <c>agrilink_ml.train</c>. Models are loaded once at
/// startup from <c>&lt;ModelsDirectory&gt;/&lt;crop&gt;/model.onnx</c> + <c>model.json</c>; a crop whose files
/// are missing or invalid is logged and skipped, so its photos simply go through the text agents.
/// </summary>
public sealed class OnnxImageClassifier : IImageClassifier, IDisposable
{
    private readonly Dictionary<string, LoadedModel> _models = new(StringComparer.OrdinalIgnoreCase);
    private readonly TimeSpan _timeout;

    private sealed record LoadedModel(ModelMetadata Metadata, InferenceSession Session);

    public OnnxImageClassifier(string modelsDirectory, int intraOpThreads, TimeSpan timeout, ILogger<OnnxImageClassifier> logger)
    {
        _timeout = timeout;

        if (!Directory.Exists(modelsDirectory))
        {
            logger.LogWarning("No image classification models found: {Directory} does not exist. Photos will use the text-only agents.", modelsDirectory);
            return;
        }

        foreach (var cropDirectory in Directory.EnumerateDirectories(modelsDirectory))
        {
            var metadataPath = Path.Combine(cropDirectory, "model.json");
            var modelPath = Path.Combine(cropDirectory, "model.onnx");
            if (!File.Exists(metadataPath) || !File.Exists(modelPath))
            {
                continue;
            }

            InferenceSession? session = null;
            try
            {
                var metadata = ModelMetadata.Parse(File.ReadAllText(metadataPath));
                metadata.Validate();

                using var options = new Microsoft.ML.OnnxRuntime.SessionOptions
                {
                    IntraOpNumThreads = intraOpThreads,
                    InterOpNumThreads = 1,
                };
                session = new InferenceSession(modelPath, options);
                if (!session.InputNames.Contains(metadata.Input.Name) || !session.OutputNames.Contains(metadata.Output.Name))
                {
                    throw new InvalidDataException("model.json input/output names do not match the ONNX model.");
                }

                if (!_models.TryAdd(metadata.Crop, new LoadedModel(metadata, session)))
                {
                    throw new InvalidDataException($"A model for crop '{metadata.Crop}' is already loaded.");
                }

                logger.LogInformation("Loaded image classification model {ModelVersion} for {Crop}", metadata.ModelVersion, metadata.Crop);
                session = null; // owned by _models now
            }
            catch (Exception ex) when (ex is InvalidDataException or System.Text.Json.JsonException or OnnxRuntimeException)
            {
                logger.LogError(ex, "Skipping the image classification model in {Directory}", cropDirectory);
            }
            finally
            {
                session?.Dispose();
            }
        }
    }

    public bool SupportsCrop(string cropType) => _models.ContainsKey(cropType.Trim());

    public async Task<ImageFindings> ClassifyAsync(string cropType, byte[] image, CancellationToken cancellationToken)
    {
        if (!_models.TryGetValue(cropType.Trim(), out var model))
        {
            throw new NotSupportedException($"No image classification model is loaded for '{cropType}'.");
        }

        try
        {
            // ONNX Runtime inference cannot be cancelled mid-run; the timeout stops waiting for it so
            // a slow classification never holds up the farmer's report.
            return await Task.Run(() => Classify(model, image), cancellationToken).WaitAsync(_timeout, cancellationToken);
        }
        catch (TimeoutException)
        {
            throw new TimeoutException($"Classifying the photo took longer than {_timeout.TotalSeconds:0} seconds.");
        }
    }

    private static ImageFindings Classify(LoadedModel model, byte[] image)
    {
        var metadata = model.Metadata;
        var tensor = ImagePreprocessor.ToTensor(image, metadata.Input);

        using var input = OrtValue.CreateTensorValueFromMemory(tensor, new long[] { 1, 3, metadata.Input.Height, metadata.Input.Width });
        using var outputs = model.Session.Run(
            new RunOptions(), new[] { metadata.Input.Name }, new[] { input }, new[] { metadata.Output.Name });

        var probabilities = outputs[0].GetTensorDataAsSpan<float>().ToArray();
        if (probabilities.Length != metadata.Classes.Count)
        {
            throw new InvalidOperationException(
                $"The model returned {probabilities.Length} probabilities for {metadata.Classes.Count} classes.");
        }

        var ranked = metadata.Classes
            .Select(c => new { Class = c, Probability = (double)probabilities[c.Id] })
            .OrderByDescending(p => p.Probability)
            .ToList();

        return new ImageFindings
        {
            Crop = metadata.Crop,
            ModelVersion = metadata.ModelVersion,
            Predictions = ranked.Select(p => new ClassPrediction(p.Class.Key, p.Class.Name, p.Probability)).ToList(),
            AutoReleaseThreshold = ranked[0].Class.AutoReleaseThreshold,
        };
    }

    public void Dispose()
    {
        foreach (var model in _models.Values)
        {
            model.Session.Dispose();
        }
        _models.Clear();
    }
}
