using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgriLink.API.Tests.Agents;

public class ValidationAgentTests
{
    private const string ClosingDisclaimer =
        "This is an AI-generated suggestion pending review by an agricultural officer — do not apply any treatment until it has been approved.";

    private static ValidationAgent CreateAgent() => new(NullLogger<ValidationAgent>.Instance);

    private static AgentContext BuildContext(
        IssueSeverity severity = IssueSeverity.Low,
        IReadOnlyList<AgentActivitySnapshot>? recentActivities = null) => new()
    {
        CropId = 1,
        CropType = "Rice",
        Variety = "Test",
        IssueTitle = "Leaves turning yellow",
        IssueDescription = "Leaves turning yellow after recent heavy rain.",
        Severity = severity,
        District = "Colombo",
        RecentActivities = recentActivities ?? Array.Empty<AgentActivitySnapshot>(),
    };

    [Theory]
    [InlineData(IssueSeverity.High)]
    public async Task ValidateAsync_HighSeverity_AlwaysHighRisk(IssueSeverity severity)
    {
        var agent = CreateAgent();
        var context = BuildContext(severity);

        var result = await agent.ValidateAsync(context, cropFindings: null, weatherFindings: null, CancellationToken.None);

        Assert.Equal(RiskLevel.High, result.RiskLevel);
    }

    [Fact]
    public async Task ValidateAsync_HighSeverityWithFindings_StillHighRisk()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.High);
        var cropFindings = new CropFindings
        {
            PossibleCauses = new[] { "Possible pest infestation" },
            RecommendedActions = new[] { "Inspect for pests" },
            Confidence = 0.6f,
        };
        var weatherFindings = new WeatherFindings { Summary = "Dry conditions", IsFallback = false };

        var result = await agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None);

        Assert.Equal(RiskLevel.High, result.RiskLevel);
    }

    [Fact]
    public async Task ValidateAsync_NoFindings_UsesSafeGenericFallback()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.Medium);

        var result = await agent.ValidateAsync(context, cropFindings: null, weatherFindings: null, CancellationToken.None);

        Assert.Equal(0.2f, result.ConfidenceScore);
        Assert.True(result.RequiresApproval);
        Assert.Equal(RiskLevel.Medium, result.RiskLevel);
        Assert.EndsWith(ClosingDisclaimer, result.Recommendation);
    }

    [Fact]
    public async Task ValidateAsync_NitrogenDeficiencyWithRecentFertilizing_BumpsRiskAndFlagsConflict()
    {
        var agent = CreateAgent();
        var recentActivities = new[]
        {
            new AgentActivitySnapshot("Fertilizing", DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-5), "Applied nitrogen fertilizer"),
        };
        var context = BuildContext(IssueSeverity.Low, recentActivities);
        var cropFindings = new CropFindings
        {
            PossibleCauses = new[] { "Nitrogen deficiency" },
            RecommendedActions = new[] { "Apply fertilizer" },
            Confidence = 0.6f,
        };

        var conflictResult = await agent.ValidateAsync(context, cropFindings, weatherFindings: null, CancellationToken.None);

        var noConflictContext = BuildContext(IssueSeverity.Low);
        var noConflictResult = await agent.ValidateAsync(noConflictContext, cropFindings, weatherFindings: null, CancellationToken.None);

        Assert.Equal(RiskLevel.Medium, conflictResult.RiskLevel);
        Assert.Contains("fertiliz", conflictResult.Notes, StringComparison.OrdinalIgnoreCase);
        Assert.True(conflictResult.ConfidenceScore < noConflictResult.ConfidenceScore);
    }

    [Fact]
    public async Task ValidateAsync_FertilizingActivityOutsideWindow_DoesNotConflict()
    {
        var agent = CreateAgent();
        var recentActivities = new[]
        {
            new AgentActivitySnapshot("Fertilizing", DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30), "Applied nitrogen fertilizer"),
        };
        var context = BuildContext(IssueSeverity.Low, recentActivities);
        var cropFindings = new CropFindings
        {
            PossibleCauses = new[] { "Nitrogen deficiency" },
            RecommendedActions = new[] { "Apply fertilizer" },
            Confidence = 0.6f,
        };

        var result = await agent.ValidateAsync(context, cropFindings, weatherFindings: null, CancellationToken.None);

        Assert.Equal(RiskLevel.Low, result.RiskLevel);
    }

    [Fact]
    public async Task ValidateAsync_FungalCauseWithHeavyRainfall_HigherConfidenceThanWithoutWeather()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.Low);
        var cropFindings = new CropFindings
        {
            PossibleCauses = new[] { "Fungal infection likely" },
            RecommendedActions = new[] { "Apply fungicide as directed by an officer" },
            Confidence = 0.6f,
        };
        var weatherFindings = new WeatherFindings
        {
            Summary = "Heavy rainfall over the past week",
            RecentRainfallMm = 80,
            IsFallback = false,
        };

        var withWeatherResult = await agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None);
        var withoutWeatherResult = await agent.ValidateAsync(context, cropFindings, weatherFindings: null, CancellationToken.None);

        Assert.True(withWeatherResult.ConfidenceScore > withoutWeatherResult.ConfidenceScore);
    }

    public static IEnumerable<object[]> FuzzInputCombinations()
    {
        yield return new object[] { IssueSeverity.Low, null!, null! };
        yield return new object[] { IssueSeverity.High, new CropFindings(), new WeatherFindings { IsFallback = true } };
        yield return new object[]
        {
            IssueSeverity.Medium,
            new CropFindings { PossibleCauses = new[] { "Nitrogen deficiency" } },
            null!,
        };
        yield return new object[]
        {
            IssueSeverity.Low,
            new CropFindings { PossibleCauses = new[] { "Fungal blight" } },
            new WeatherFindings { RecentRainfallMm = 100, IsFallback = false },
        };
        yield return new object[]
        {
            IssueSeverity.High,
            new CropFindings { PossibleCauses = new[] { "Nitrogen deficiency" }, RecommendedActions = new[] { "Fertilize" } },
            new WeatherFindings { RecentRainfallMm = 90, IsFallback = false },
        };
    }

    [Theory]
    [MemberData(nameof(FuzzInputCombinations))]
    public async Task ValidateAsync_ConfidenceScore_NeverOutsideValidRange(
        IssueSeverity severity, CropFindings? cropFindings, WeatherFindings? weatherFindings)
    {
        var agent = CreateAgent();
        var context = BuildContext(severity);

        var result = await agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None);

        Assert.InRange(result.ConfidenceScore, 0.05f, 0.95f);
    }

    [Fact]
    public async Task ValidateAsync_FullFallbackBranch_EndsWithDisclaimer()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.Low);

        var result = await agent.ValidateAsync(context, cropFindings: null, weatherFindings: null, CancellationToken.None);

        Assert.EndsWith(ClosingDisclaimer, result.Recommendation);
    }

    [Fact]
    public async Task ValidateAsync_NormalBranch_EndsWithDisclaimer()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.Low);
        var cropFindings = new CropFindings
        {
            PossibleCauses = new[] { "Possible pest infestation" },
            RecommendedActions = new[] { "Inspect leaves closely" },
        };
        var weatherFindings = new WeatherFindings { Summary = "Mild conditions", IsFallback = false };

        var result = await agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None);

        Assert.EndsWith(ClosingDisclaimer, result.Recommendation);
    }

    [Fact]
    public async Task ValidateAsync_ConflictBranch_EndsWithDisclaimer()
    {
        var agent = CreateAgent();
        var recentActivities = new[]
        {
            new AgentActivitySnapshot("Fertilizing", DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1), "Applied fertilizer"),
        };
        var context = BuildContext(IssueSeverity.Low, recentActivities);
        var cropFindings = new CropFindings { PossibleCauses = new[] { "Nutrient deficiency" } };

        var result = await agent.ValidateAsync(context, cropFindings, weatherFindings: null, CancellationToken.None);

        Assert.EndsWith(ClosingDisclaimer, result.Recommendation);
    }

    [Theory]
    [MemberData(nameof(FuzzInputCombinations))]
    public async Task ValidateAsync_NeverThrows(
        IssueSeverity severity, CropFindings? cropFindings, WeatherFindings? weatherFindings)
    {
        var agent = CreateAgent();
        var context = BuildContext(severity);

        var exception = await Record.ExceptionAsync(() =>
            agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None));

        Assert.Null(exception);
    }

    [Fact]
    public async Task ValidateAsync_EmptyFindingsLists_DoesNotThrow()
    {
        var agent = CreateAgent();
        var context = BuildContext(IssueSeverity.Low);
        var cropFindings = new CropFindings
        {
            PossibleCauses = Array.Empty<string>(),
            RecommendedActions = Array.Empty<string>(),
        };
        var weatherFindings = new WeatherFindings();

        var exception = await Record.ExceptionAsync(() =>
            agent.ValidateAsync(context, cropFindings, weatherFindings, CancellationToken.None));

        Assert.Null(exception);
    }
}
