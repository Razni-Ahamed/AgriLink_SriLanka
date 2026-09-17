namespace AgriLink.API.Services.Agents;

/// <summary>What the agents know about one class a crop's photo model can predict.</summary>
/// <param name="Crop">Crop name as in the crop catalogue and the model's model.json.</param>
/// <param name="Key">Class key from ml/labels/&lt;crop&gt;.json.</param>
/// <param name="IsSerious">Always needs an officer, however confident the model is.</param>
/// <param name="Treatment">Advice the agent may give without an officer. Null until an agricultural
/// officer has written or approved it — a disease with no treatment always goes to an officer.</param>
/// <param name="WeatherRelated">Rainfall or humidity drives it, so weather context is fetched.</param>
/// <param name="DescriptionKeywords">Lower-case words a farmer might use for this disease; used to
/// spot a description that points to a different disease than the photo.</param>
public record DiseaseKnowledgeEntry(
    string Crop,
    string Key,
    string DisplayName,
    bool IsSerious,
    string? Treatment,
    bool WeatherRelated,
    IReadOnlyList<string> DescriptionKeywords)
{
    public const string HealthyKey = "healthy";

    public bool IsHealthy => Key == HealthyKey;
}

public interface IDiseaseKnowledgeBase
{
    DiseaseKnowledgeEntry? Find(string crop, string key);

    IReadOnlyList<DiseaseKnowledgeEntry> ForCrop(string crop);
}

// Static and versioned with the code, like CropKnowledgeBase. Every class in ml/labels/*.json must
// have an entry here (DiseaseKnowledgeBaseTests checks that).
//
// Safe defaults until an agricultural officer reviews this table: every disease is marked serious
// and has no treatment, so nothing is released to a farmer without an officer. To allow
// auto-release for a disease, add officer-approved advice as its Treatment and clear IsSerious.
// Keep IsSerious set for any disease whose treatment involves pesticides or fungicides.
public class DiseaseKnowledgeBase : IDiseaseKnowledgeBase
{
    public static readonly IReadOnlyList<DiseaseKnowledgeEntry> DefaultEntries = new DiseaseKnowledgeEntry[]
    {
        new("Cassava", "cassava_bacterial_blight", "Cassava bacterial blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "bacterial blight", "blight", "angular spots", "gum" }),
        new("Cassava", "cassava_brown_streak_disease", "Cassava brown streak disease",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "brown streak", "streak", "root rot", "brown roots" }),
        new("Cassava", "cassava_green_mottle", "Cassava green mottle",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "green mottle", "mottle", "mottling" }),
        new("Cassava", "cassava_mosaic_disease", "Cassava mosaic disease",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "mosaic", "twisted leaves", "distorted leaves" }),
        new("Cassava", DiseaseKnowledgeEntry.HealthyKey, "No disease visible",
            IsSerious: false, Treatment: null, WeatherRelated: false,
            Array.Empty<string>()),
    };

    private readonly IReadOnlyList<DiseaseKnowledgeEntry> _entries;

    public DiseaseKnowledgeBase() : this(DefaultEntries)
    {
    }

    public DiseaseKnowledgeBase(IReadOnlyList<DiseaseKnowledgeEntry> entries)
    {
        _entries = entries;
    }

    public DiseaseKnowledgeEntry? Find(string crop, string key) =>
        _entries.FirstOrDefault(e =>
            string.Equals(e.Crop, crop.Trim(), StringComparison.OrdinalIgnoreCase) &&
            string.Equals(e.Key, key, StringComparison.Ordinal));

    public IReadOnlyList<DiseaseKnowledgeEntry> ForCrop(string crop) =>
        _entries.Where(e => string.Equals(e.Crop, crop.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
}
