namespace AgriLink.API.DTOs.Advisories;

/// <summary>
/// Body for POST /api/advisories/{id}/approve and /reject. Both fields are optional so an
/// existing bare approve/reject (no body at all) still works exactly as before this existed.
/// </summary>
public class ReviewAdvisoryRequest
{
    /// <summary>The reviewing officer's own note — why this was rejected, or extension advice
    /// beyond the AI's recommendation. Shown to the farmer in their notification and stored on
    /// the advisory for the officer's own review history.</summary>
    public string? Note { get; set; }
}
