namespace AgriLink.API.Models;

public enum PurchaseRequestStatus
{
    Pending,
    Accepted,
    Declined,
    Cancelled,

    /// <summary>The buyer took the request back before the farmer answered.</summary>
    Withdrawn,
}
