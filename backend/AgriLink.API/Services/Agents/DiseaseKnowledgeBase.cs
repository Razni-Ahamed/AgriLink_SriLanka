namespace AgriLink.API.Services.Agents;

/// <summary>What the agents know about one class a crop's photo model can predict.</summary>
/// <param name="Crop">Crop name as in the crop catalogue and the model's model.json.</param>
/// <param name="Key">Class key from ml/labels/&lt;crop&gt;.json.</param>
/// <param name="IsSerious">Always needs an officer, however confident the model is.</param>
/// <param name="Treatment">The advice for this disease. It is shown to the reviewing officer as a
/// starting point they can accept or edit, and is only ever sent to a farmer on its own when the
/// disease is not <see cref="DiseaseKnowledgeEntry.IsSerious"/> — that is, once an agricultural
/// officer has approved it for release. Null means the officer writes the advice from scratch.</param>
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
// Every disease is marked serious, so nothing here reaches a farmer without an officer. The Cassava
// treatments are drafts (docs/ai-advisory/cassava-treatment-drafts.md) written from the Department of
// Agriculture Sri Lanka's cassava guidance and international extension fact sheets, and they are
// offered to the reviewing officer as a starting point rather than sent out on their own.
//
// To let a disease's advice reach farmers directly, an agricultural officer must approve the wording
// and clear IsSerious for it. Keep IsSerious set for any disease whose advice involves pesticides or
// fungicides. Tomato and Potato have no drafted advice yet, so their officers start from a blank box.
public class DiseaseKnowledgeBase : IDiseaseKnowledgeBase
{
    public static readonly IReadOnlyList<DiseaseKnowledgeEntry> DefaultEntries = new DiseaseKnowledgeEntry[]
    {
        new("Cassava", "cassava_bacterial_blight", "Cassava bacterial blight",
            IsSerious: true,
            Treatment: "Sprays do not control this disease. Remove and destroy affected plants in dry weather, " +
                       "so the bacteria spread less, and clean knives and tools with bleach afterwards. Do not take " +
                       "cuttings from this field. After harvest, destroy all leftover stems and leaves, and do not " +
                       "plant cassava on the same land for one to two years.",
            WeatherRelated: true,
            new[] { "bacterial blight", "blight", "angular spots", "gum" }),
        new("Cassava", "cassava_brown_streak_disease", "Cassava brown streak disease",
            IsSerious: true,
            Treatment: "This disease is not known to occur in Sri Lanka, so confirm it by inspection before advising. " +
                       "Meanwhile the farmer should not use any stems from this field as cuttings, should pull out and " +
                       "destroy plants showing symptoms, and should clean tools after cutting them.",
            WeatherRelated: false,
            new[] { "brown streak", "streak", "root rot", "brown roots" }),
        new("Cassava", "cassava_green_mottle", "Cassava green mottle",
            IsSerious: true,
            Treatment: "This disease is known only from the Solomon Islands, so confirm it by inspection before " +
                       "advising. Meanwhile the farmer should remove and destroy plants with mottled, puckered leaves " +
                       "and take cuttings only from plants without symptoms.",
            WeatherRelated: false,
            new[] { "green mottle", "mottle", "mottling" }),
        new("Cassava", "cassava_mosaic_disease", "Cassava mosaic disease",
            IsSerious: true,
            Treatment: "There is no cure once a plant is infected. Pull out plants showing yellow-green patches and " +
                       "twisted, shrunken leaves as soon as they appear, roots and all, and destroy them away from the " +
                       "field. Take cuttings only from plants that stayed healthy, keep the field free of weeds, remove " +
                       "wild cassava nearby, and do not start a new cassava plot next to an affected field.",
            WeatherRelated: false,
            new[] { "mosaic", "twisted leaves", "distorted leaves" }),
        // Serious on purpose, though "healthy" is not a disease: telling a farmer their crop is fine is the
        // costliest mistake to get wrong, and on the test photos diseased plants were called healthy most often.
        new("Cassava", DiseaseKnowledgeEntry.HealthyKey, "No disease visible",
            IsSerious: true,
            Treatment: "No disease was visible in the photo. Ask the farmer to send a clearer close-up of the affected " +
                       "leaves if the problem continues or spreads.",
            WeatherRelated: false,
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
            IsSerious: true, Treatment: null, WeatherRelated: false,
            Array.Empty<string>()),

        new("Potato", "potato_early_blight", "Potato early blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "early blight", "target rings", "concentric rings" }),
        new("Potato", "potato_late_blight", "Potato late blight",
            IsSerious: true, Treatment: null, WeatherRelated: true,
            new[] { "late blight" }),
        new("Potato", DiseaseKnowledgeEntry.HealthyKey, "No disease visible",
            IsSerious: true, Treatment: null, WeatherRelated: false,
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
