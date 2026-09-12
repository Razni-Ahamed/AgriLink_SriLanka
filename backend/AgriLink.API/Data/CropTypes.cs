namespace AgriLink.API.Data;

/// <summary>
/// The canonical crop catalogue, offered as a fixed dropdown everywhere a crop is recorded
/// instead of the free text it used to be.
///
/// Crop type is a category, not a label: the marketplace filters and groups listings by it, and
/// Services.Agents.CropKnowledgeBase matches its diagnostic rules on it. Free text meant
/// "Tomato", "tomato" and "Tomatoe" became three separate marketplace categories, and the
/// misspelt one silently matched no advisory rule at all — the farmer got a generic advisory
/// with no explanation of why.
///
/// Covers Sri Lanka's plantation, cereal, pulse, root, vegetable, fruit and spice crops.
/// "Other" is the deliberate escape hatch so an unusual crop is still recordable without
/// reopening free text; it matches only the wildcard rules in the knowledge base.
/// </summary>
public static class CropTypes
{
    public static readonly IReadOnlyList<string> All = new[]
    {
        // Plantation / export
        "Tea", "Rubber", "Coconut", "Cinnamon", "Pepper", "Cardamom", "Sugarcane",
        // Cereals and pulses
        "Paddy", "Maize", "Green Gram", "Cowpea", "Groundnut", "Soybean",
        // Roots and tubers
        "Potato", "Sweet Potato", "Cassava", "Onion",
        // Vegetables
        "Tomato", "Chilli", "Brinjal", "Okra", "Cabbage", "Carrot", "Beans", "Pumpkin",
        "Cucumber", "Leeks", "Beetroot",
        // Fruit
        "Banana", "Mango", "Pineapple", "Papaya", "Avocado", "Passion Fruit",
        // Escape hatch
        "Other",
    };

    public static bool IsValid(string? cropType) =>
        Canonicalize(cropType) is not null;

    /// <summary>
    /// Returns the catalogue's own spelling of <paramref name="cropType"/> (matching
    /// case-insensitively and ignoring surrounding whitespace), or null when it is not a known
    /// crop. Callers store the returned value so the database only ever holds canonical
    /// spellings — validating alone would still let "tea" and "Tea" split into two categories.
    /// </summary>
    public static string? Canonicalize(string? cropType)
    {
        if (string.IsNullOrWhiteSpace(cropType))
        {
            return null;
        }

        var trimmed = cropType.Trim();
        return All.FirstOrDefault(c => string.Equals(c, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
