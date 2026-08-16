using System.Security.Claims;

namespace AgriLink.API.Services;

public interface ICurrentUserService
{
    int GetUserId(ClaimsPrincipal principal);
    bool IsAdmin(ClaimsPrincipal principal);
    Task<int?> GetFarmerProfileIdAsync(ClaimsPrincipal principal);
}
