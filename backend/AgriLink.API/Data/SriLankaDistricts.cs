namespace AgriLink.API.Data;

/// <summary>
/// Sri Lanka's 25 administrative districts, offered as a fixed dropdown wherever a user profile
/// records a district (registration, admin user creation, role changes) instead of free text a
/// typo could corrupt. Kept in sync by name with
/// Services.Agents.SriLankaDistrictCoordinates — that list adds lat/lon centroids for the
/// Weather Agent and lives in a different layer, so the two are not merged into one source.
/// </summary>
public static class SriLankaDistricts
{
    public static readonly IReadOnlyList<string> All = new[]
    {
        "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
        "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
        "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa",
        "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
    };

    public static bool IsValid(string? district) => Canonicalize(district) is not null;

    /// <summary>
    /// Returns the list's own spelling of <paramref name="district"/> (matched
    /// case-insensitively, surrounding whitespace ignored), or null when it is not a district.
    /// Callers store the returned value: validating alone accepted "kandy" and stored it
    /// verbatim, so the same district could sit in the database under several spellings and
    /// split every district filter and grouping that keys off it.
    /// </summary>
    public static string? Canonicalize(string? district)
    {
        if (string.IsNullOrWhiteSpace(district))
        {
            return null;
        }

        var trimmed = district.Trim();
        return All.FirstOrDefault(d => string.Equals(d, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
