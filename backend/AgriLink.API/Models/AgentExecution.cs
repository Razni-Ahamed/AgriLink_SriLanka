using System.ComponentModel.DataAnnotations.Schema;

namespace AgriLink.API.Models;

public class AgentExecution
{
    public int ExecutionId { get; set; }
    public int WorkflowId { get; set; }
    public string AgentName { get; set; } = string.Empty;

    [Column(TypeName = "jsonb")]
    public string? InputData { get; set; }

    [Column(TypeName = "jsonb")]
    public string? OutputData { get; set; }

    public ExecutionStatus Status { get; set; } = ExecutionStatus.Running;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public AgentWorkflow Workflow { get; set; } = null!;
}
