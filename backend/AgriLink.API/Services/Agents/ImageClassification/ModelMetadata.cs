using System.Text.Json;

namespace AgriLink.API.Services.Agents.ImageClassification;

/// <summary>The <c>model.json</c> written next to each exported model by <c>agrilink_ml.train</c>.</summary>
public record ModelMetadata
{
    public string Crop { get; init; } = string.Empty;
    public int LabelsVersion { get; init; }
    public string ModelVersion { get; init; } = string.Empty;
    public ModelInputSpec Input { get; init; } = new();
    public ModelOutputSpec Output { get; init; } = new();
    public IReadOnlyList<ModelClass> Classes { get; init; } = Array.Empty<ModelClass>();

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static ModelMetadata Parse(string json) =>
        JsonSerializer.Deserialize<ModelMetadata>(json, JsonOptions)
        ?? throw new InvalidDataException("model.json is empty.");

    /// <summary>Throws when this backend cannot feed the model exactly the way it was evaluated.</summary>
    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Crop)) throw new InvalidDataException("model.json has no crop.");
        if (Input.Layout != "NCHW") throw new InvalidDataException($"Unsupported input layout '{Input.Layout}'.");
        if (Input.ColorOrder != "RGB") throw new InvalidDataException($"Unsupported colour order '{Input.ColorOrder}'.");
        if (Input.Resize != "stretch") throw new InvalidDataException($"Unsupported resize mode '{Input.Resize}'.");
        if (Input.Interpolation != "bilinear") throw new InvalidDataException($"Unsupported interpolation '{Input.Interpolation}'.");
        if (Input.Width <= 0 || Input.Height <= 0) throw new InvalidDataException("Input size must be positive.");
        if (Input.Mean.Count != 3 || Input.Std.Count != 3 || Input.Std.Any(s => s <= 0))
            throw new InvalidDataException("Input mean and std must have three values, with positive std.");
        if (Classes.Count == 0 || !Classes.Select(c => c.Id).OrderBy(id => id).SequenceEqual(Enumerable.Range(0, Classes.Count)))
            throw new InvalidDataException("Class ids must be exactly 0..n-1.");
        if (Classes.Any(c => c.AutoReleaseThreshold is < 0 or > 1))
            throw new InvalidDataException("Auto-release thresholds must be between 0 and 1.");
    }
}

public record ModelInputSpec
{
    public string Name { get; init; } = "image";
    public string Layout { get; init; } = string.Empty;
    public int Width { get; init; }
    public int Height { get; init; }
    public string ColorOrder { get; init; } = string.Empty;
    public string Resize { get; init; } = string.Empty;
    public string Interpolation { get; init; } = string.Empty;
    public double Scale { get; init; } = 1.0 / 255;
    public IReadOnlyList<double> Mean { get; init; } = Array.Empty<double>();
    public IReadOnlyList<double> Std { get; init; } = Array.Empty<double>();
}

public record ModelOutputSpec
{
    public string Name { get; init; } = "probabilities";
}

public record ModelClass
{
    public int Id { get; init; }
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;

    /// <summary>Release stored advice without an officer only when this class is the top prediction
    /// with at least this probability. Null: never — every case of this class goes to an officer.</summary>
    public double? AutoReleaseThreshold { get; init; }
}
