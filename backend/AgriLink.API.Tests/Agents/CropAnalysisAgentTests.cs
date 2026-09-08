using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriLink.API.Tests.Agents;

public class CropAnalysisAgentTests
{
    private const string FallbackCause = "No matching pattern in the knowledge base for this description.";

    private static CropAnalysisAgent CreateAgent() => new(NullLogger<CropAnalysisAgent>.Instance);

    private static AgentContext BuildContext(
        string title,
        string description,
        string cropType = "Rice",
        IEnumerable<AgentActivitySnapshot>? activities = null) => new()
    {
        CropId = 1,
        CropType = cropType,
        Variety = "Test",
        PlantingDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-60),
        ExpectedHarvestDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(30),
        IssueTitle = title,
        IssueDescription = description,
        Severity = IssueSeverity.Medium,
        District = "Colombo",
        RecentActivities = activities?.ToList() ?? new List<AgentActivitySnapshot>(),
    };

    private static AgentActivitySnapshot Fertilizing(int daysAgo) =>
        new("Fertilizing", DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-daysAgo), "Applied urea top dressing.");

    [Fact]
    public async Task AnalyzeAsync_KnownKeywordForKnownCrop_ReturnsExpectedCause()
    {
        var agent = CreateAgent();
        var context = BuildContext("Yellow leaves on the paddy", "The older leaves are turning yellow from the bottom up.");

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.Contains(findings.PossibleCauses, c => c.Contains("Nitrogen deficiency", StringComparison.OrdinalIgnoreCase));
        Assert.NotEmpty(findings.RecommendedActions);
        Assert.True(findings.Confidence >= 0.5f, $"Expected confidence >= 0.5 but was {findings.Confidence}.");
    }

    [Fact]
    public async Task AnalyzeAsync_CropSpecificKeyword_ReturnsCropSpecificCause()
    {
        var agent = CreateAgent();
        var context = BuildContext("Black bottom on fruit", "The bottom of the fruit is black and sunken.", cropType: "Tomato");

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.Contains(findings.PossibleCauses, c => c.Contains("Blossom-end rot", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AnalyzeAsync_CropSpecificRuleDoesNotLeakToOtherCrops()
    {
        var agent = CreateAgent();
        var context = BuildContext("Black bottom on fruit", "The bottom of the fruit is black and sunken.", cropType: "Rice");

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.DoesNotContain(findings.PossibleCauses, c => c.Contains("Blossom-end rot", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task AnalyzeAsync_UnrecognizedDescription_ReturnsGenericFallback()
    {
        var agent = CreateAgent();
        var context = BuildContext("Question about paperwork", "I want to know when the subsidy form is due.");

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.Equal(new[] { FallbackCause }, findings.PossibleCauses);
        Assert.Equal(new[] { "Recommend manual inspection by an agricultural officer." }, findings.RecommendedActions);
        Assert.Equal(0.2f, findings.Confidence, 3);
    }

    [Fact]
    public async Task AnalyzeAsync_RecentFertilizerWithDeficiencyDiagnosis_LowersConfidenceAndNotesConflict()
    {
        var agent = CreateAgent();
        var baseline = await CreateAgent().AnalyzeAsync(
            BuildContext("Yellow leaves", "Leaves are turning yellow."), CancellationToken.None);

        var context = BuildContext(
            "Yellow leaves",
            "Leaves are turning yellow.",
            activities: new[] { Fertilizing(daysAgo: 3) });

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.Contains("fertilizer was applied recently", findings.Notes, StringComparison.OrdinalIgnoreCase);
        Assert.True(
            findings.Confidence < baseline.Confidence,
            $"Expected confidence below the baseline {baseline.Confidence} but was {findings.Confidence}.");
    }

    [Fact]
    public async Task AnalyzeAsync_FertilizerOutsideLookbackWindow_DoesNotFlagConflict()
    {
        var agent = CreateAgent();
        var context = BuildContext(
            "Yellow leaves",
            "Leaves are turning yellow.",
            activities: new[] { Fertilizing(daysAgo: 25) });

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.DoesNotContain("fertilizer was applied recently", findings.Notes, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzeAsync_MultipleDistinctCauses_LowersConfidenceAndFlagsAmbiguity()
    {
        var agent = CreateAgent();
        var context = BuildContext(
            "Several problems in the field",
            "There are holes in the leaves, a white powder on some plants, and the soil is waterlogged.");

        var findings = await agent.AnalyzeAsync(context, CancellationToken.None);

        Assert.True(findings.PossibleCauses.Count > 1);
        Assert.True(findings.Confidence < 0.75f);
        Assert.Contains("not conclusive", findings.Notes, StringComparison.OrdinalIgnoreCase);
    }
}
