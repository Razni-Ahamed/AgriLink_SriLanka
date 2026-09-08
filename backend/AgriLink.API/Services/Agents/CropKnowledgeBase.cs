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
}
