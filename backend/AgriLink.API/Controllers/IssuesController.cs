using System.Text.Json;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Issues;
using AgriLink.API.Models;
using AgriLink.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly AgriLinkDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public IssuesController(AgriLinkDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpPost]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<CropIssueResponse>> Create(CreateCropIssueRequest request)
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var crop = await _db.Crops
            .Include(c => c.Field)
            .ThenInclude(f => f.Farm)
            .FirstOrDefaultAsync(c => c.CropId == request.CropId);

        if (crop is null)
        {
            return NotFound(new { message = "Crop not found." });
        }

        if (crop.Field.Farm.FarmerProfileId != farmerProfileId)
        {
            return Forbid();
        }

        var issue = new CropIssue
        {
            CropId = request.CropId,
            FarmerProfileId = farmerProfileId.Value,
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Status = IssueStatus.AwaitingReview,
        };

        // Week 5: stub AI response (hard-coded). Replace with the real
        // Planner/Crop/Weather/Validation agent pipeline in Week 6.
        var advisory = BuildStubAdvisory(issue);
        issue.Advisories.Add(advisory);

        _db.CropIssues.Add(issue);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToResponse(issue));
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Farmer")]
    public async Task<ActionResult<List<CropIssueResponse>>> Mine()
    {
        var farmerProfileId = await _currentUser.GetFarmerProfileIdAsync(User);
        if (farmerProfileId is null)
        {
            return Forbid();
        }

        var issues = await _db.CropIssues
            .Where(i => i.FarmerProfileId == farmerProfileId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(ToResponse));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Officer,Admin")]
    public async Task<ActionResult<List<CropIssueResponse>>> Pending()
    {
        var issues = await _db.CropIssues
            .Where(i => i.Advisories.Any(a => a.Status == AdvisoryStatus.Draft))
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        return Ok(issues.Select(ToResponse));
    }

    private static AIAdvisory BuildStubAdvisory(CropIssue issue)
    {
        var now = DateTime.UtcNow;

        var riskLevel = issue.Severity switch
        {
            IssueSeverity.High => RiskLevel.High,
            IssueSeverity.Medium => RiskLevel.Medium,
            _ => RiskLevel.Low,
        };

        var advisory = new AIAdvisory
        {
            Status = AdvisoryStatus.Draft,
            RiskLevel = riskLevel,
            Recommendation = $"Preliminary review of '{issue.Title}': monitor the crop closely and consult " +
                              "an agricultural officer before taking action. This is a stub recommendation " +
                              "pending the Planner/Crop/Weather/Validation agent pipeline.",
            ConfidenceScore = 0.5f,
            RequiresApproval = true,
        };

        var workflow = new AgentWorkflow
        {
            Advisory = advisory,
            Objective = $"Analyze crop issue: {issue.Title}",
            CurrentStep = "StubAnalysis",
            Status = WorkflowStatus.Completed,
            RequiresHumanApproval = true,
            StartedAt = now,
            CompletedAt = now,
        };

        var execution = new AgentExecution
        {
            Workflow = workflow,
            AgentName = "StubAgent",
            InputData = JsonSerializer.Serialize(new { issue.Title, issue.Description, Severity = issue.Severity.ToString() }),
            OutputData = JsonSerializer.Serialize(new { RiskLevel = riskLevel.ToString(), advisory.Recommendation, advisory.ConfidenceScore }),
            Status = ExecutionStatus.Completed,
            StartedAt = now,
            CompletedAt = now,
        };

        workflow.Executions.Add(execution);
        advisory.Workflows.Add(workflow);
        return advisory;
    }

    private static CropIssueResponse ToResponse(CropIssue issue) => new()
    {
        IssueId = issue.IssueId,
        CropId = issue.CropId,
        Title = issue.Title,
        Description = issue.Description,
        Severity = issue.Severity.ToString(),
        Status = issue.Status.ToString(),
        CreatedAt = issue.CreatedAt,
    };
}
