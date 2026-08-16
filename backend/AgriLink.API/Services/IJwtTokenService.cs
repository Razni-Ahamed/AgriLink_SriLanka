using AgriLink.API.Models;

namespace AgriLink.API.Services;

public interface IJwtTokenService
{
    string GenerateToken(ApplicationUser user, IList<string> roles);
}
