using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;

namespace AgriLink.API.Tests.Agents;

public class PhotoTriageTests
{
    private static readonly DiseaseKnowledgeEntry Mosaic = new(
        "Cassava", "cassava_mosaic_disease", "Cassava mosaic disease",
        IsSerious: false, Treatment: "Remove infected plants and plant clean cuttings.", WeatherRelated: false,
        new[] { "mosaic" });

    private static readonly DiseaseKnowledgeEntry BrownStreak = new(
        "Cassava", "cassava_brown_streak_disease", "Cassava brown streak disease",
        IsSerious: true, Treatment: null, WeatherRelated: false,
        new[] { "brown streak" });

    private static readonly IReadOnlyList<DiseaseKnowledgeEntry> Cassava = new[] { Mosaic, BrownStreak };

    private static ImageFindings Findings(string key, double probability, double? threshold) => new()
    {
        Crop = "Cassava",
        ModelVersion = "test",
        Predictions = new[] { new ClassPrediction(key, key, probability) },
        AutoReleaseThreshold = threshold,
    };

    private static PhotoTriageResult Decide(
        ImageFindings findings, DiseaseKnowledgeEntry? disease, string text = "Leaves look strange", bool enabled = true) =>
        PhotoTriage.Decide(findings, disease, Cassava, text, enabled);

    [Fact]
    public void KnownMinorDisease_ConfidentModel_ApprovedTreatment_IsAutoReleased()
    {
        var result = Decide(Findings(Mosaic.Key, 0.97, threshold: 0.9), Mosaic);

        Assert.True(result.AutoRelease);
        Assert.Empty(result.EscalationReasons);
        Assert.Equal("Cassava mosaic disease", result.DiseaseName);
    }

    [Fact]
    public void SeriousDiseaseWithoutTreatment_ListsEveryReason()
    {
        var result = Decide(Findings(BrownStreak.Key, 0.99, threshold: 0.9), BrownStreak);

        Assert.False(result.AutoRelease);
        Assert.Equal(new[] { EscalationReason.SeriousDisease, EscalationReason.NoApprovedTreatment }, result.EscalationReasons);
    }

    [Fact]
    public void ConfidenceBelowTheClassThreshold_Escalates()
    {
        var result = Decide(Findings(Mosaic.Key, 0.85, threshold: 0.9), Mosaic);

        Assert.Equal(new[] { EscalationReason.LowConfidence }, result.EscalationReasons);
    }

    [Fact]
    public void ClassTheModelCannotReliablyIdentify_Escalates_EvenAtFullConfidence()
    {
        var result = Decide(Findings(Mosaic.Key, 1.0, threshold: null), Mosaic);

        Assert.Equal(new[] { EscalationReason.ModelNeverAutoReleases }, result.EscalationReasons);
    }

    [Fact]
    public void PredictionMissingFromTheKnowledgeBase_Escalates()
    {
        var result = Decide(Findings("cassava_new_disease", 0.99, threshold: 0.9), disease: null);

        Assert.Equal(new[] { EscalationReason.UnknownDisease }, result.EscalationReasons);
    }

    [Fact]
    public void DescriptionNamingADifferentDisease_Escalates()
    {
        var result = Decide(Findings(Mosaic.Key, 0.97, threshold: 0.9), Mosaic, text: "I think it is Brown Streak");

        Assert.Equal(new[] { EscalationReason.DescriptionMismatch }, result.EscalationReasons);
    }

    [Theory]
    [InlineData("Yellow patches everywhere")] // names no disease: no signal
    [InlineData("Could be mosaic or brown streak")] // mentions the predicted disease too
    public void DescriptionThatDoesNotContradictThePhoto_IsNotAMismatch(string text)
    {
        var result = Decide(Findings(Mosaic.Key, 0.97, threshold: 0.9), Mosaic, text);

        Assert.True(result.AutoRelease);
    }

    [Fact]
    public void AutoReleaseSwitchedOff_KeepsEvenACleanCaseForTheOfficer()
    {
        var result = Decide(Findings(Mosaic.Key, 0.97, threshold: 0.9), Mosaic, enabled: false);

        Assert.False(result.AutoRelease);
        Assert.Equal(new[] { EscalationReason.AutoReleaseDisabled }, result.EscalationReasons);
    }
}
