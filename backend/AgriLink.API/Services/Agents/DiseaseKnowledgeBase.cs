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

    /// <summary>An officer's correction for a disease that is not one of the model's classes.</summary>
    public const string OtherKey = "other";

    public const string OtherDisplayName = "Other (not in the list)";

    public bool IsHealthy => Key == HealthyKey;
}

public interface IDiseaseKnowledgeBase
{
    DiseaseKnowledgeEntry? Find(string crop, string key);

    IReadOnlyList<DiseaseKnowledgeEntry> ForCrop(string crop);

    /// <summary>A display name for any key an advisory can hold, including "other"; falls back to
    /// the key itself for one no longer in the knowledge base.</summary>
    string DisplayName(string crop, string key);
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

        // Weather-related: spread or favoured by rain splash, leaf wetness or high humidity.
        new("Tomato", "tomato_bacterial_spot", "Tomato bacterial spot",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "bacterial spot" }),
        new("Tomato", "tomato_early_blight", "Tomato early blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "early blight", "target rings", "concentric rings" }),
        new("Tomato", "tomato_late_blight", "Tomato late blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "late blight" }),
        new("Tomato", "tomato_leaf_mold", "Tomato leaf mold",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "leaf mold", "leaf mould" }),
        new("Tomato", "tomato_septoria_leaf_spot", "Tomato Septoria leaf spot",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "septoria" }),
        new("Tomato", "tomato_spider_mites", "Tomato two-spotted spider mites",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "spider mite", "mites", "webbing" }),
        new("Tomato", "tomato_target_spot", "Tomato target spot",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "target spot" }),
        new("Tomato", "tomato_yellow_leaf_curl_virus", "Tomato yellow leaf curl virus",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "leaf curl", "yellow curl", "curling" }),
        new("Tomato", "tomato_mosaic_virus", "Tomato mosaic virus",
            IsSerious: true, Treatment: null, WeatherRelated: false,
            new[] { "mosaic" }),
        new("Tomato", DiseaseKnowledgeEntry.HealthyKey, "No disease visible",
            IsSerious: false, Treatment: null, WeatherRelated: false,
            Array.Empty<string>()),

        new("Potato", "potato_early_blight", "Potato early blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "early blight", "target rings", "concentric rings" }),
        new("Potato", "potato_late_blight", "Potato late blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "late blight" }),
        new("Potato", DiseaseKnowledgeEntry.HealthyKey, "No disease visible",
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

    public string DisplayName(string crop, string key) =>
        key == DiseaseKnowledgeEntry.OtherKey ? DiseaseKnowledgeEntry.OtherDisplayName : Find(crop, key)?.DisplayName ?? key;
}
