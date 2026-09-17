using System.ComponentModel.DataAnnotations;

namespace AgriLink.API.DTOs.Advisories;

/// <summary>
/// Body for POST /api/advisories/{id}/approve and /reject. Every field is optional for an advisory
/// without a photo diagnosis, so an existing bare approve/reject (no body at all) still works exactly
/// as before. For a photo diagnosis the officer decides the treatment — see AdvisoriesController.Review
/// for which fields each action then requires.
/// </summary>
public class ReviewAdvisoryRequest
{
    /// <summary>The reviewing officer's own note — why this was rejected, or extension advice
    /// beyond the AI's recommendation. Shown to the farmer in their notification and stored on
    /// the advisory for the officer's own review history.</summary>
    public string? Note { get; set; }

    /// <summary>Reject only, for a photo diagnosis: the correct disease — a class key for the crop
    /// (see AdvisoryResponse.PhotoDiagnosis.DiseaseOptions) or "other".</summary>
    [MaxLength(100)]
    public string? DiseaseKey { get; set; }

    /// <summary>The treatment the farmer should follow, written by the officer.</summary>
    [MaxLength(2000)]
    public string? Treatment { get; set; }
}
