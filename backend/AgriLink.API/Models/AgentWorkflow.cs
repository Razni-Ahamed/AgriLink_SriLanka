namespace AgriLink.API.Models;

public class AgentWorkflow
{
    public int WorkflowId { get; set; }
    public int AdvisoryId { get; set; }
    public string Objective { get; set; } = string.Empty;
    public string? CurrentStep { get; set; }
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Running;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public bool RequiresHumanApproval { get; set; } = true;

    public AIAdvisory Advisory { get; set; } = null!;
    public ICollection<AgentExecution> Executions { get; set; } = new List<AgentExecution>();
}
