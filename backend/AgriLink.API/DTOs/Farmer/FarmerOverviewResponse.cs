namespace AgriLink.API.DTOs.Farmer;

/// <summary>What a farmer sees first on their home page: what needs their attention.</summary>
public class FarmerOverviewResponse
{
    /// <summary>Crop problems still waiting for an officer (Pending or AwaitingReview).</summary>
    public int OpenIssues { get; set; }

    public int ActiveListings { get; set; }

    /// <summary>Buyers' requests the farmer hasn't accepted or declined yet.</summary>
    public int PendingRequests { get; set; }

    /// <summary>Confirmed orders not yet completed or cancelled.</summary>
    public int OrdersInProgress { get; set; }

    /// <summary>The most recently approved advice on one of the farmer's issues; null when there is none.</summary>
    public LatestAdvice? LatestAdvice { get; set; }
}

public class LatestAdvice
{
    public int AdvisoryId { get; set; }
    public int IssueId { get; set; }
    public string IssueTitle { get; set; } = string.Empty;
    public string CropType { get; set; } = string.Empty;
    public DateTime ReviewedAt { get; set; }
}
