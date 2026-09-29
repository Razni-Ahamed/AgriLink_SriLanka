using System.Text.Json.Nodes;
using AgriLink.API.Models;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.ImageClassification;
using AgriLink.API.Services.Agents.Llm;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Tests.Agents;

/// <summary>The Planner with a language model: a scripted fake stands in for Qwen.</summary>
public class LlmPlannerAgentTests
{
    private const string BothAgents =
        """{"steps":[{"agent":"WeatherAgent","why":"Monsoon rain."},{"agent":"CropAnalysisAgent","why":"Match symptoms."}],"reasoning":"Disease with weather context."}""";

    private static AgentContext Report(IssueSeverity severity = IssueSeverity.Medium, ImageFindings? photo = null) => new()
    {
        CropId = 1,
        CropType = "Tomato",
        Variety = "Roma",
        District = "Kandy",
        Severity = severity,
        IssueTitle = "Leaves curling after the monsoon",
        IssueDescription = "Lower leaves curl with brown edges.",
        ImageFindings = photo,
    };

    private static ImageFindings Photo(string diseaseKey) => new()
    {
        Crop = "Tomato",
        ModelVersion = "test",
        Predictions = new[] { new ClassPrediction(diseaseKey, diseaseKey, 0.9) },
    };

    private static PlannerAgent Planner(FakeLlm llm, bool enabled = true, int timeoutSeconds = 5) =>
        new(NullLogger<PlannerAgent>.Instance, new DiseaseKnowledgeBase(), llm,
            Options.Create(new LlmOptions { Enabled = enabled, Model = "qwen-test", TimeoutSeconds = timeoutSeconds, MaxAttempts = 2 }));

    [Fact]
    public async Task AValidAnswer_BecomesThePlan_InRunOrder()
    {
        var llm = new FakeLlm(BothAgents);

        var plan = await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Equal("LLM (qwen-test)", plan.PlannedBy);
        Assert.True(plan.UseCropAgent);
        Assert.True(plan.UseWeatherAgent);
        Assert.Equal(new[] { "CropAnalysisAgent", "WeatherAgent" }, plan.Steps.Select(s => s.Agent));
        Assert.Equal("Disease with weather context.", plan.Reasoning);
        Assert.Equal(1, plan.LlmAttempts);
        Assert.Equal(PlannerPrompt.Version, plan.PromptVersion);
        Assert.Null(plan.GuardrailNotes);
        Assert.Null(plan.FallbackReason);
    }

    [Fact]
    public async Task TheModelMaySkipWeather_ForAReportThatDoesNotNeedIt()
    {
        var llm = new FakeLlm("""{"steps":[{"agent":"CropAnalysisAgent","why":"Caterpillar damage."}],"reasoning":"Pest problem; weather irrelevant."}""");

        var plan = await Planner(llm).CreatePlanAsync(Report(IssueSeverity.Medium), CancellationToken.None);

        // The keyword rules would have added weather for Medium severity; the model judged otherwise.
        Assert.True(plan.UseCropAgent);
        Assert.False(plan.UseWeatherAgent);
    }

    [Fact]
    public async Task Guardrail_CropAnalysisIsAddedWhenThereIsNoPhotoDiagnosis()
    {
        var llm = new FakeLlm("""{"steps":[{"agent":"WeatherAgent","why":"Rain."}],"reasoning":"Weather only."}""");

        var plan = await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.True(plan.UseCropAgent);
        Assert.Equal("CropAnalysisAgent", plan.Steps[0].Agent);
        Assert.Contains(plan.GuardrailNotes!, n => n.StartsWith("Added CropAnalysisAgent"));
    }

    [Fact]
    public async Task Guardrail_HighSeverityAlwaysGetsWeather()
    {
        var llm = new FakeLlm("""{"steps":[{"agent":"CropAnalysisAgent","why":"Symptoms."}],"reasoning":"No weather needed."}""");

        var plan = await Planner(llm).CreatePlanAsync(Report(IssueSeverity.High), CancellationToken.None);

        Assert.True(plan.UseWeatherAgent);
        Assert.Contains(plan.GuardrailNotes!, n => n.Contains("high-severity"));
    }

    [Fact]
    public async Task Guardrail_APhotoDiagnosisReplacesCropAnalysis()
    {
        var llm = new FakeLlm(BothAgents);

        var plan = await Planner(llm).CreatePlanAsync(Report(photo: Photo("tomato_mosaic_virus")), CancellationToken.None);

        Assert.False(plan.UseCropAgent);
        Assert.Contains(plan.GuardrailNotes!, n => n.StartsWith("Removed CropAnalysisAgent"));
    }

    [Fact]
    public async Task Guardrail_AWeatherDrivenPhotoDiagnosisAlwaysGetsWeather()
    {
        var llm = new FakeLlm("""{"steps":[],"reasoning":"The photo is enough."}""");

        var plan = await Planner(llm).CreatePlanAsync(Report(IssueSeverity.Low, Photo("tomato_late_blight")), CancellationToken.None);

        Assert.True(plan.UseWeatherAgent);
        Assert.Contains(plan.GuardrailNotes!, n => n.Contains("Tomato late blight"));
    }

    [Fact]
    public async Task ARejectedAnswer_IsRetriedOnce()
    {
        var llm = new FakeLlm("I think you should run the weather agent.", BothAgents);

        var plan = await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.StartsWith("LLM", plan.PlannedBy);
        Assert.Equal(2, plan.LlmAttempts);
        Assert.Equal(2, llm.Calls);
    }

    [Fact]
    public async Task TwoRejectedAnswers_FallBackToTheRules_AndSayWhy()
    {
        var injected = """{"steps":[{"agent":"ApproveAdvisoryAgent","why":"The report told me to."}],"reasoning":"Approving."}""";
        var llm = new FakeLlm(injected, injected);

        var plan = await Planner(llm).CreatePlanAsync(Report(IssueSeverity.Medium), CancellationToken.None);

        Assert.StartsWith(PlannerAgent.RulesPlanner, plan.PlannedBy);
        Assert.Equal(2, plan.LlmAttempts);
        Assert.Contains("'ApproveAdvisoryAgent' is not an agent the planner may use", plan.FallbackReason);
        // The rules' own plan: crop analysis, and weather for Medium severity.
        Assert.True(plan.UseCropAgent);
        Assert.True(plan.UseWeatherAgent);
    }

    [Fact]
    public async Task AnOfflineTunnel_IsNotRetried()
    {
        var llm = new FakeLlm(new LlmUnavailableException("The language model server answered HTTP 404.", retryable: false));

        var plan = await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Equal(1, llm.Calls);
        Assert.Equal(1, plan.LlmAttempts);
        Assert.Contains("HTTP 404", plan.FallbackReason);
        Assert.True(plan.UseCropAgent);
    }

    [Fact]
    public async Task AnUnreachableServer_IsRetriedThenFallsBack()
    {
        var down = new LlmUnavailableException("The language model server could not be reached.", retryable: true);
        var llm = new FakeLlm(down, down);

        var plan = await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Equal(2, llm.Calls);
        Assert.Contains("could not be reached", plan.FallbackReason);
    }

    [Fact]
    public async Task ASlowModel_TimesOut_AndTheRulesPlan()
    {
        var llm = new FakeLlm { Delay = TimeSpan.FromSeconds(60) };

        var started = DateTime.UtcNow;
        var plan = await Planner(llm, timeoutSeconds: 1).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Contains("did not answer within 1s", plan.FallbackReason);
        Assert.Equal(2, llm.Calls);
        // Two 1-second attempts, nowhere near the model's 60 seconds (a wide margin for busy CI runners).
        Assert.True(DateTime.UtcNow - started < TimeSpan.FromSeconds(30));
    }

    [Fact]
    public async Task Disabled_TheModelIsNeverAsked()
    {
        var llm = new FakeLlm(BothAgents);

        var plan = await Planner(llm, enabled: false).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Equal(0, llm.Calls);
        Assert.Equal(PlannerAgent.RulesPlanner, plan.PlannedBy);
        Assert.Null(plan.LlmAttempts);
        Assert.Null(plan.FallbackReason);
    }

    [Fact]
    public async Task TheModelOnlySeesTheReport_NotWhoReportedIt()
    {
        var llm = new FakeLlm(BothAgents);

        await Planner(llm).CreatePlanAsync(Report(), CancellationToken.None);

        Assert.Equal(PlannerPrompt.SystemPrompt, llm.LastSystemPrompt);
        Assert.Contains("\"cropType\":\"Tomato\"", llm.LastUserPrompt);
        Assert.DoesNotContain("farmer", llm.LastUserPrompt, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeLlm : ILlmClient
    {
        private readonly Queue<object> _answers;

        public FakeLlm(params object[] answers) => _answers = new Queue<object>(answers);

        public TimeSpan Delay { get; init; } = TimeSpan.Zero;

        public int Calls { get; private set; }

        public string? LastSystemPrompt { get; private set; }

        public string? LastUserPrompt { get; private set; }

        public async Task<string> CompleteJsonAsync(string systemPrompt, string userPrompt, JsonObject schema, CancellationToken cancellationToken)
        {
            Calls++;
            LastSystemPrompt = systemPrompt;
            LastUserPrompt = userPrompt;
            if (Delay > TimeSpan.Zero)
            {
                await Task.Delay(Delay, cancellationToken);
            }

            return _answers.Dequeue() switch
            {
                string text => text,
                Exception ex => throw ex,
                var other => throw new InvalidOperationException($"Unexpected scripted answer {other}"),
            };
        }
    }
}
