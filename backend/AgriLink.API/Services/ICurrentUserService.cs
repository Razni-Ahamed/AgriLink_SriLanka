using System.Security.Claims;

namespace AgriLink.API.Services;

public interface ICurrentUserService
{
    int GetUserId(ClaimsPrincipal principal);
    bool IsAdmin(ClaimsPrincipal principal);
    Task<int?> GetFarmerProfileIdAsync(ClaimsPrincipal principal);
    Task<int?> GetOfficerProfileIdAsync(ClaimsPrincipal principal);

    /// <summary>
    /// The calling Officer's assigned district, or null if the caller has no OfficerProfile.
    /// Used to scope the review queue and dashboard metrics to the same district
    /// AgentOrchestrator.NotifyOfficersAsync already notifies them about — without this, an
    /// officer's queue and their notifications disagree about which issues are "theirs".
    /// </summary>
    Task<string?> GetOfficerDistrictAsync(ClaimsPrincipal principal);
    Task<int?> GetBuyerProfileIdAsync(ClaimsPrincipal principal);
}
