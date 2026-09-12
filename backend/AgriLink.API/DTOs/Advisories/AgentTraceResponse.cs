namespace AgriLink.API.DTOs.Advisories;

/// <summary>
/// One AgentExecution row, reshaped for display: the raw model stores InputData/OutputData as
/// opaque JSON strings (that's what AgentOrchestrator.ExecuteStepAsync serializes them as), so
/// the client gets them pre-parsed as JsonElement rather than having to parse a JSON string
/// embedded in a JSON response itself.
/// </summary>
public class AgentStepResponse
{
    public string AgentName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public object? Input { get; set; }
    public object? Output { get; set; }
}

/// <summary>
/// The full agent-pipeline run behind one advisory: every step PlannerAgent, CropAnalysisAgent,
/// WeatherAgent and ValidationAgent actually took (some are conditionally skipped by the
/// planner's own decision — a skipped step just doesn't appear here). This has always been
/// recorded (AgentWorkflow/AgentExecution) but never exposed by any endpoint before now, which
/// is why nothing about it ever reached the frontend.
/// </summary>
public class AgentTraceResponse
{
    public string Objective { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<AgentStepResponse> Steps { get; set; } = new();
}
