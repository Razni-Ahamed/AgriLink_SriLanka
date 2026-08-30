using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using Microsoft.Extensions.Logging;
using Moq;

namespace AgriLink.API.Tests.Agents;

public class PlannerAgentTests
{
    private static AgentContext BuildContext(string title, string description, IssueSeverity severity) => new()
    {
        CropId = 1,
        CropType = "Rice",
        Variety = "Test",
        IssueTitle = title,
        IssueDescription = description,
        Severity = severity,
        District = "Colombo",
    };

    private static PlannerAgent CreateAgent() => new(Mock.Of<ILogger<PlannerAgent>>());

    public static IEnumerable<object[]> WeatherKeywordCases()
    {
        yield return new object[] { "Crop is wilting after heavy rain", "", IssueSeverity.Low };
        yield return new object[] { "Issue with crop", "The field is flooded and roots are rotting", IssueSeverity.Low };
        yield return new object[] { "Drought stress", "", IssueSeverity.Low };
        yield return new object[] { "Fungal infection spreading", "leaves show mold", IssueSeverity.Low };
    }

    [Theory]
    [MemberData(nameof(WeatherKeywordCases))]
    public async Task CreatePlanAsync_WeatherKeywordPresent_UsesWeatherAgent(string title, string description, IssueSeverity severity)
    {
        var agent = CreateAgent();
        var context = BuildContext(title, description, severity);

        var plan = await agent.CreatePlanAsync(context, CancellationToken.None);

        Assert.True(plan.UseWeatherAgent);
        Assert.True(plan.UseCropAgent);
    }

    [Theory]
    [InlineData(IssueSeverity.High)]
    [InlineData(IssueSeverity.Medium)]
    public async Task CreatePlanAsync_ElevatedSeverityNoKeyword_UsesWeatherAgent(IssueSeverity severity)
    {
        var agent = CreateAgent();
        var context = BuildContext("Leaves turning yellow", "No obvious cause visible.", severity);

        var plan = await agent.CreatePlanAsync(context, CancellationToken.None);

        Assert.True(plan.UseWeatherAgent);
        Assert.True(plan.UseCropAgent);
    }

    [Fact]
    public async Task CreatePlanAsync_LowSeverityNoKeyword_SkipsWeatherAgent()
    {
        var agent = CreateAgent();
        var context = BuildContext("Leaves turning yellow", "No obvious cause visible.", IssueSeverity.Low);

        var plan = await agent.CreatePlanAsync(context, CancellationToken.None);

        Assert.False(plan.UseWeatherAgent);
        Assert.True(plan.UseCropAgent);
    }
}
