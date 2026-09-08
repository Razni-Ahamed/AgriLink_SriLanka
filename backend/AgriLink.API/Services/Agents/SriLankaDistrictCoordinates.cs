namespace AgriLink.API.Services.Agents;

// Hardcoded centroids for Sri Lanka's 25 administrative districts. The weather agent builds its
// outbound request from these numeric values only — never from the raw, free-text district string
// stored on Farm — so an unrecognized or hostile district value can never reach the network layer.
public static class SriLankaDistrictCoordinates
{
    public static readonly IReadOnlyDictionary<string, (double Lat, double Lon)> Districts =
        new Dictionary<string, (double Lat, double Lon)>(StringComparer.OrdinalIgnoreCase)
        {
            ["Ampara"] = (7.30, 81.68), ["Anuradhapura"] = (8.31, 80.40), ["Badulla"] = (6.99, 81.06),
            ["Batticaloa"] = (7.71, 81.70), ["Colombo"] = (6.93, 79.85), ["Galle"] = (6.05, 80.22),
            ["Gampaha"] = (7.09, 79.99), ["Hambantota"] = (6.12, 81.12), ["Jaffna"] = (9.66, 80.02),
            ["Kalutara"] = (6.58, 79.96), ["Kandy"] = (7.29, 80.63), ["Kegalle"] = (7.25, 80.35),
            ["Kilinochchi"] = (9.40, 80.40), ["Kurunegala"] = (7.48, 80.36), ["Mannar"] = (8.98, 79.90),
            ["Matale"] = (7.47, 80.62), ["Matara"] = (5.95, 80.55), ["Monaragala"] = (6.87, 81.35),
            ["Mullaitivu"] = (9.27, 80.81), ["Nuwara Eliya"] = (6.97, 80.77), ["Polonnaruwa"] = (7.94, 81.00),
            ["Puttalam"] = (8.03, 79.83), ["Ratnapura"] = (6.68, 80.40), ["Trincomalee"] = (8.57, 81.23),
            ["Vavuniya"] = (8.75, 80.50),
        };

    // District is entered as free text in FarmsController, so match leniently: trim the ends, collapse
    // any run of internal whitespace to a single space, and compare case-insensitively.
    public static (double Lat, double Lon)? Lookup(string? district)
    {
        if (string.IsNullOrWhiteSpace(district))
        {
            return null;
        }

        var normalized = string.Join(' ', district.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return Districts.TryGetValue(normalized, out var coords) ? coords : null;
    }
}
