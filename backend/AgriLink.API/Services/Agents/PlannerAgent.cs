using AgriLink.API.Models;
using AgriLink.API.Services.Agents.Llm;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents;

/// <summary>
/// Decides which analysis agents a crop issue needs. When a language model is configured (Llm:*)
/// it makes the plan, and deterministic guardrails then check and correct that plan; when the model
/// is off, unreachable, too slow or answers badly, the keyword rules below plan instead, so an issue
/// is never held up by the model. Either way the Validation agent runs and an officer approves.
/// </summary>
public class PlannerAgent : IPlannerAgent
{
    public const string RulesPlanner = "Rules";

    private static readonly string[] WeatherKeywords =
    {
        "rain", "flood", "drought", "dry", "wind", "storm", "frost", "heat",
        "wilt", "mold", "mould", "fungus", "fungal", "humid", "water", "rot",
    };

    private readonly ILogger<PlannerAgent> _logger;
    private readonly IDiseaseKnowledgeBase _diseases;
    private readonly ILlmClient? _llm;
    private readonly LlmOptions _llmOptions;

    /// <summary>The rules only — as the tests and a deployment without a model use it.</summary>
    public PlannerAgent(ILogger<PlannerAgent> logger, IDiseaseKnowledgeBase diseases)
        : this(logger, diseases, llm: null, Options.Create(new LlmOptions()))
    {
    }

    public PlannerAgent(ILogger<PlannerAgent> logger, IDiseaseKnowledgeBase diseases, ILlmClient? llm, IOptions<LlmOptions> llmOptions)
    {
        _logger = logger;
        _diseases = diseases;
        _llm = llm;
        _llmOptions = llmOptions.Value;
    }

    public async Task<PlannerPlan> CreatePlanAsync(AgentContext context, CancellationToken cancellationToken)
    {
        var photoDisease = context.ImageFindings is { } image ? _diseases.Find(context.CropType, image.Top.Key) : null;
        var rulesPlan = context.ImageFindings is null ? PlanFromText(context) : PlanFromPhoto(context, photoDisease);

        var plan = _llm is not null && _llmOptions.Enabled
            ? await PlanWithModelAsync(context, photoDisease, rulesPlan, cancellationToken)
            : rulesPlan;

        _logger.LogInformation("Planner decision for issue '{Title}' by {PlannedBy}: {Reasoning}", context.IssueTitle, plan.PlannedBy, plan.Reasoning);
        return plan;
    }

    // ---------- Language model ----------

    private async Task<PlannerPlan> PlanWithModelAsync(
        AgentContext context, DiseaseKnowledgeEntry? photoDisease, PlannerPlan rulesPlan, CancellationToken cancellationToken)
    {
        var userPrompt = PlannerPrompt.UserPrompt(context, photoDisease);
        var maxAttempts = Math.Max(1, _llmOptions.MaxAttempts);
        string problem = "no attempt was made";
        var attempts = 0;

        while (attempts < maxAttempts)
        {
            attempts++;
            using var attemptTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            attemptTimeout.CancelAfter(TimeSpan.FromSeconds(_llmOptions.TimeoutSeconds));
            try
            {
                var answer = await _llm!.CompleteJsonAsync(
                    PlannerPrompt.SystemPrompt, userPrompt, PlannerPrompt.OutputSchema(), attemptTimeout.Token);
                var (parsed, error) = PlannerPrompt.Parse(answer);
                if (parsed is not null)
                {
                    return ApplyGuardrails(parsed, context, photoDisease, attempts);
                }

                problem = $"its answer was rejected: {error}";
            }
            catch (LlmUnavailableException ex)
            {
                problem = ex.Message;
                if (!ex.Retryable)
                {
                    break;
                }
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                problem = $"it did not answer within {_llmOptions.TimeoutSeconds}s";
            }

            _logger.LogWarning("LLM planner attempt {Attempt} of {MaxAttempts} failed: {Problem}", attempts, maxAttempts, problem);
        }

        return rulesPlan with
        {
            PlannedBy = $"{RulesPlanner} (the language model was not used)",
            LlmAttempts = attempts,
            FallbackReason = $"The language model planner was skipped because {LowerFirst(problem)}",
        };
    }

    /// <summary>
    /// Business rules the model's plan must meet whatever it said; each correction is recorded.
    /// Without a photo diagnosis, crop analysis is the only source of a diagnosis, so it always runs.
    /// With one, the photo replaces keyword crop analysis. High-severity reports, and diseases the
    /// photo model knows to be weather-driven, always get weather context.
    /// </summary>
    private PlannerPlan ApplyGuardrails(PlannerPrompt.ParsedPlan parsed, AgentContext context, DiseaseKnowledgeEntry? photoDisease, int attempts)
    {
        var steps = parsed.Steps.ToList();
        var notes = new List<string>();
        var hasPhotoDiagnosis = context.ImageFindings is not null;

        bool Has(string agent) => steps.Any(s => s.Agent == agent);

        if (!hasPhotoDiagnosis && !Has(PlannerPrompt.CropAnalysisAgent))
        {
            steps.Add(new PlanStep(PlannerPrompt.CropAnalysisAgent, "Required: without a photo diagnosis it is the only source of a diagnosis."));
            notes.Add("Added CropAnalysisAgent: it always runs when there is no photo diagnosis.");
        }

        if (hasPhotoDiagnosis && Has(PlannerPrompt.CropAnalysisAgent))
        {
            steps.RemoveAll(s => s.Agent == PlannerPrompt.CropAnalysisAgent);
            notes.Add("Removed CropAnalysisAgent: the photo diagnosis replaces keyword crop analysis.");
        }

        if (!Has(PlannerPrompt.WeatherAgent))
        {
            string? mustHaveWeather = context.Severity == IssueSeverity.High ? "high-severity reports always get weather context"
                : photoDisease?.WeatherRelated == true ? $"{photoDisease.DisplayName} is a weather-driven disease"
                : null;
            if (mustHaveWeather is not null)
            {
                steps.Add(new PlanStep(PlannerPrompt.WeatherAgent, $"Required: {mustHaveWeather}."));
                notes.Add($"Added WeatherAgent: {mustHaveWeather}.");
            }
        }

        // The order the orchestrator runs them in: diagnosis first, then its weather context.
        var ordered = steps.OrderBy(s => s.Agent == PlannerPrompt.CropAnalysisAgent ? 0 : 1).ToList();

        return new PlannerPlan
        {
            UseCropAgent = ordered.Any(s => s.Agent == PlannerPrompt.CropAnalysisAgent),
            UseWeatherAgent = ordered.Any(s => s.Agent == PlannerPrompt.WeatherAgent),
            Reasoning = parsed.Reasoning,
            PlannedBy = $"LLM ({_llmOptions.Model})",
            Steps = ordered,
            LlmAttempts = attempts,
            PromptVersion = PlannerPrompt.Version,
            GuardrailNotes = notes.Count > 0 ? notes : null,
        };
    }

    private static string LowerFirst(string text) => text.Length == 0 ? text : char.ToLowerInvariant(text[0]) + text[1..];

    // ---------- Rules ----------

    private static PlannerPlan PlanFromText(AgentContext context)
    {
        var keywordHit = FindWeatherKeyword(context);
        var useWeather = keywordHit is not null || context.Severity != IssueSeverity.Low;
        var weatherTrigger = keywordHit is not null ? $"keyword '{keywordHit}'" : $"severity={context.Severity}";

        var reasoning = useWeather
            ? $"Crop analysis always runs. Weather analysis triggered by {weatherTrigger}."
            : "Crop analysis always runs. Weather analysis skipped (low severity, no weather-related keywords).";

        var steps = new List<PlanStep> { new(PlannerPrompt.CropAnalysisAgent, "Crop analysis always runs without a photo diagnosis.") };
        if (useWeather)
        {
            steps.Add(new PlanStep(PlannerPrompt.WeatherAgent, $"Triggered by {weatherTrigger}."));
        }

        return new PlannerPlan { UseCropAgent = true, UseWeatherAgent = useWeather, Reasoning = reasoning, Steps = steps };
    }

    // With a photo diagnosis, keyword matching on the description would only compete with it, so
    // crop analysis is skipped; weather still matters when the diagnosed disease is moisture-driven.
    private static PlannerPlan PlanFromPhoto(AgentContext context, DiseaseKnowledgeEntry? disease)
    {
        var top = context.ImageFindings!.Top;
        var keywordHit = FindWeatherKeyword(context);

        string? weatherTrigger = disease?.WeatherRelated == true ? $"the photo diagnosis ({disease.DisplayName}) is weather-related"
            : keywordHit is not null ? $"keyword '{keywordHit}'"
            : context.Severity != IssueSeverity.Low ? $"severity={context.Severity}"
            : null;

        var reasoning = $"Photo classified as '{top.Key}' ({top.Probability:P0}), so keyword crop analysis is skipped. " +
            (weatherTrigger is not null ? $"Weather analysis triggered because {weatherTrigger}." : "Weather analysis skipped.");

        var steps = weatherTrigger is not null
            ? new List<PlanStep> { new(PlannerPrompt.WeatherAgent, $"Triggered because {weatherTrigger}.") }
            : new List<PlanStep>();

        return new PlannerPlan { UseCropAgent = false, UseWeatherAgent = weatherTrigger is not null, Reasoning = reasoning, Steps = steps };
    }

    private static string? FindWeatherKeyword(AgentContext context)
    {
        var text = $"{context.IssueTitle} {context.IssueDescription}";
        return WeatherKeywords.FirstOrDefault(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
    }
}
