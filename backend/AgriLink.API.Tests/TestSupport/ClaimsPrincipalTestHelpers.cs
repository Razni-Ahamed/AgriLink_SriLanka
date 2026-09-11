using System.Security.Claims;

namespace AgriLink.API.Tests.TestSupport;

public static class ClaimsPrincipalTestHelpers
{
    /// <summary>
    /// Builds a ClaimsPrincipal shaped like the one Program.cs's JWT bearer configuration
    /// produces at runtime: NameIdentifier carries the user id, Role carries the role name.
    /// </summary>
    public static ClaimsPrincipal BuildPrincipal(int userId, string role)
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role),
            },
            authenticationType: "TestAuth",
            nameType: ClaimTypes.NameIdentifier,
            roleType: ClaimTypes.Role);

        return new ClaimsPrincipal(identity);
    }
}
