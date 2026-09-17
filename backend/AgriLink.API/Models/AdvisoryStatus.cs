namespace AgriLink.API.Models;

public enum AdvisoryStatus
{
    Draft,
    Approved,
    Rejected,

    /// <summary>Advice from a confident photo diagnosis of a known, minor disease, already visible to
    /// the farmer and still awaiting an officer's confirmation. Only produced when
    /// ImageClassification:AutoReleaseEnabled is on.</summary>
    Preliminary
}
