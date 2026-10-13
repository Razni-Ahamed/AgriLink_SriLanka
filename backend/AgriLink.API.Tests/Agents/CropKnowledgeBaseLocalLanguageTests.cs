using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AgriLink.API.Tests.Agents;

/// <summary>Reports written in Sinhala or Tamil reach the same rules as English ones, instead of
/// always getting the "no matching pattern" fallback.</summary>
public class CropKnowledgeBaseLocalLanguageTests
{
    private const string FallbackCause = "No matching pattern in the knowledge base for this description.";

    private static AgentContext Report(string title, string description, string cropType = "Tomato", IssueSeverity severity = IssueSeverity.Low) => new()
    {
        CropId = 1,
        CropType = cropType,
        IssueTitle = title,
        IssueDescription = description,
        Severity = severity,
        District = "Kandy",
    };

    private static Task<CropFindings> AnalyzeAsync(AgentContext context) =>
        new CropAnalysisAgent(NullLogger<CropAnalysisAgent>.Instance).AnalyzeAsync(context, CancellationToken.None);

    [Fact]
    public void EveryLocalLanguageKeywordList_BelongsToARealRule()
    {
        var causes = CropKnowledgeBase.Entries.Select(e => e.PossibleCause).ToHashSet();

        Assert.All(CropKnowledgeBase.LocalLanguageKeywords().Keys, cause => Assert.Contains(cause, causes));
    }

    [Fact]
    public void EveryRule_HasSinhalaAndTamilKeywords()
    {
        var local = CropKnowledgeBase.LocalLanguageKeywords();

        Assert.All(CropKnowledgeBase.Entries, entry =>
        {
            Assert.True(local.TryGetValue(entry.PossibleCause, out var words), $"No local keywords for '{entry.PossibleCause}'.");
            Assert.Contains(words!, w => w.Any(c => c is >= '඀' and <= '෿'));  // Sinhala block
            Assert.Contains(words!, w => w.Any(c => c is >= '஀' and <= '௿'));  // Tamil block
        });
    }

    [Theory]
    [InlineData("තක්කාලි කොළ කහ පාට වෙලා", "පහළ කොළ කහ වෙනවා")]
    [InlineData("இலைகள் மஞ்சளாக மாறுகின்றன", "கீழ் இலைகள் மஞ்சள் நிறமாகின்றன")]
    public async Task ASinhalaOrTamilReport_OfYellowingLeaves_FindsNitrogenDeficiency(string title, string description)
    {
        var findings = await AnalyzeAsync(Report(title, description));

        Assert.Contains(findings.PossibleCauses, c => c.Contains("Nitrogen deficiency"));
        Assert.True(findings.Confidence >= 0.5f);
    }

    [Theory]
    [InlineData("ගොයමේ දුඹුරු පැල කීඩෑවා", "Paddy")]
    [InlineData("வயலில் புகையான் தாக்குதல்", "Paddy")]
    public async Task ACropSpecificLocalWord_FindsTheCropSpecificRule(string title, string cropType)
    {
        var findings = await AnalyzeAsync(Report(title, "", cropType));

        Assert.Contains(findings.PossibleCauses, c => c.Contains("Brown planthopper"));
    }

    [Theory]
    [InlineData("කොළවල ත්‍රිප්ස්")]      // typed with a zero-width joiner
    [InlineData("කොළවල ත්රිප්ස්")]       // the same word typed without one
    public async Task SinhalaConjuncts_MatchWithOrWithoutTheZeroWidthJoiner(string title)
    {
        var findings = await AnalyzeAsync(Report(title, ""));

        Assert.Contains(findings.PossibleCauses, c => c.Contains("Thrips"));
    }

    [Fact]
    public async Task TheWordForTurmeric_IsNotMistakenForYellowing()
    {
        // "කහ" is both "yellow" and "turmeric"; only phrases about yellowing leaves are keywords.
        var findings = await AnalyzeAsync(Report("කහ අස්වැන්න ගැන ප්‍රශ්නයක්", "කහ වගාව ගැන උපදෙස් ඕනේ", cropType: "Turmeric"));

        Assert.Equal(FallbackCause, Assert.Single(findings.PossibleCauses));
    }

    [Theory]
    [InlineData("දින පහක් තිස්සේ තද වැසි", "")]
    [InlineData("ගංවතුරෙන් පස්සේ පැළ මැරෙනවා", "")]
    [InlineData("கடும் மழைக்குப் பிறகு", "")]
    [InlineData("நீண்ட வறட்சி", "")]
    public async Task ThePlanner_FindsWeatherWordsInSinhalaAndTamil(string title, string description)
    {
        var planner = new PlannerAgent(Mock.Of<ILogger<PlannerAgent>>(), new DiseaseKnowledgeBase());

        var plan = await planner.CreatePlanAsync(Report(title, description, cropType: "Rice"), CancellationToken.None);

        Assert.True(plan.UseWeatherAgent);
    }

    [Fact]
    public async Task ThePlanner_LowSeverityLocalReportWithoutWeatherWords_SkipsWeather()
    {
        var planner = new PlannerAgent(Mock.Of<ILogger<PlannerAgent>>(), new DiseaseKnowledgeBase());

        var plan = await planner.CreatePlanAsync(Report("කොළවල දළඹුවන්", "", cropType: "Rice"), CancellationToken.None);

        Assert.False(plan.UseWeatherAgent);
    }
}
