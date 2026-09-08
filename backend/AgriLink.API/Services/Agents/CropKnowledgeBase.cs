namespace AgriLink.API.Services.Agents;

// A single diagnostic rule: if the farmer's crop type matches and any keyword appears in the
// reported title/description, this cause and action become candidates for the advisory.
public record CropKnowledgeEntry(
    string[] CropTypes,      // lower-case crop names; "*" matches any crop
    string[] Keywords,       // lower-case; matched against issue title + description
    string PossibleCause,
    string RecommendedAction,
    bool WeatherRelated)     // true when the cause is typically driven by rainfall/humidity
{
    public bool MatchesCrop(string cropTypeLower) =>
        CropTypes.Any(c => c == "*" || string.Equals(c, cropTypeLower, StringComparison.OrdinalIgnoreCase));

    public bool MatchesText(string combinedLowerText) =>
        !string.IsNullOrWhiteSpace(combinedLowerText) &&
        Keywords.Any(k => combinedLowerText.Contains(k, StringComparison.OrdinalIgnoreCase));
}

// Static, in-code diagnostic dataset for the Crop Analysis agent. Deliberately not a database
// table: the rules are versioned with the code, need no EF migration, and keep the agent
// deterministic and offline-testable.
public static partial class CropKnowledgeBase
{
    // Cause phrases that cannot sensibly both be true at the same time. Used to flag an
    // ambiguous diagnosis in the findings notes rather than silently picking a winner.
    public static readonly IReadOnlyList<(string Left, string Right)> ConflictingCausePhrases = new[]
    {
        ("overwatering", "underwatering"),
        ("waterlogged", "moisture stress"),
        ("excess moisture", "dry soil"),
    };

    // --- Nutrient and water-management rules (apply to every crop) ---
    private static readonly CropKnowledgeEntry[] NutrientAndWaterEntries =
    {
        new(
            new[] { "*" },
            new[] { "yellow leaves", "yellowing", "turning yellow", "yellow leaf", "chlorosis", "pale leaves" },
            "Nitrogen deficiency showing first on the older, lower leaves",
            "Apply a nitrogen-rich top dressing at the recommended rate and re-inspect the crop after 10-14 days.",
            false),
        new(
            new[] { "*" },
            new[] { "waterlogged", "standing water", "soggy soil", "poor drainage", "field is flooded", "overwatered" },
            "Overwatering / waterlogged soil starving the roots of oxygen",
            "Improve field drainage, stop irrigation until the topsoil dries, and avoid walking on saturated beds.",
            true),
        new(
            new[] { "*" },
            new[] { "dry soil", "not watered", "no rain for", "cracked soil", "underwatered", "wilting in the afternoon" },
            "Underwatering / soil moisture stress",
            "Irrigate deeply and less frequently, and mulch around the plants to hold soil moisture.",
            true),
        new(
            new[] { "*" },
            new[] { "stunted", "not growing", "slow growth", "short plants", "growth has stopped" },
            "General nutrient deficiency or compacted, poor soil limiting root development",
            "Arrange a soil test and apply a balanced NPK fertiliser based on the result before adding anything else.",
            false),
        new(
            new[] { "*" },
            new[] { "purple leaves", "purplish", "reddish leaves", "red tinge" },
            "Phosphorus deficiency (often worse in cold or waterlogged soil)",
            "Apply a phosphorus source such as TSP or rock phosphate at the soil-test recommended rate.",
            false),
        new(
            new[] { "*" },
            new[] { "crispy", "dry edges", "brown leaf edges", "scorched", "burnt edges", "leaf margins" },
            "Potassium deficiency or heat stress scorching the leaf margins",
            "Keep irrigation regular, mulch to reduce heat stress, and apply a potassium source if a soil test confirms the deficiency.",
            false),
    };

    // --- Fungal and moisture-driven disease rules (apply to every crop) ---
    private static readonly CropKnowledgeEntry[] DiseaseEntries =
    {
        new(
            new[] { "*" },
            new[] { "wilting", "wilted", "drooping", "wilt" },
            "Root rot or a vascular wilt disease restricting water uptake",
            "Lift one affected plant and inspect the roots; destroy plants with brown, mushy roots and do not replant the same crop in that spot this season.",
            true),
        new(
            new[] { "*" },
            new[] { "white powder", "powdery", "white coating", "whitish film", "flour like" },
            "Powdery mildew, a fungal infection favoured by humid air and poor ventilation",
            "Prune for better airflow, stop overhead watering, and apply an approved sulphur or fungicide spray only on officer advice.",
            true),
        new(
            new[] { "*" },
            new[] { "black spot", "dark spots", "lesion", "spots on leaves", "blight", "brown patches" },
            "Fungal leaf blight or leaf spot disease spreading in wet foliage",
            "Remove and destroy affected leaves, switch to drip or furrow irrigation, and confirm the fungicide choice with an officer before spraying.",
            true),
        new(
            new[] { "*" },
            new[] { "fruit rot", "soft spot", "rotting fruit", "mushy fruit", "fruit is rotting" },
            "Fungal fruit rot developing under excess moisture",
            "Remove and destroy affected fruit, keep developing fruit off wet soil, and harvest promptly during wet spells.",
            true),
        new(
            new[] { "*" },
            new[] { "mould", "mold", "grey fuzz", "fuzzy growth", "musty smell" },
            "Grey mould / saprophytic fungal growth on damaged or over-humid tissue",
            "Remove the affected tissue, increase spacing and ventilation, and clear crop debris from the beds.",
            true),
        new(
            new[] { "*" },
            new[] { "stem rot", "base of the stem", "collar rot", "damping off", "seedlings collapsing" },
            "Collar or stem rot at the soil line caused by a soil-borne fungus in wet conditions",
            "Improve drainage, avoid piling wet soil against the stems, and remove collapsed seedlings together with the surrounding soil.",
            true),
    };
}
