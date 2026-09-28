using AgriLink.API.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AgriLink.API.Services;

/// <summary>
/// Backs GET /health: the API only counts as healthy when it can also reach PostgreSQL, since
/// almost every endpoint needs the database. Reports no connection details, only up or down.
/// </summary>
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly AgriLinkDbContext _db;

    public DatabaseHealthCheck(AgriLinkDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _db.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("Database reachable.")
                : HealthCheckResult.Unhealthy("Database unreachable.");
        }
        catch (Exception)
        {
            return HealthCheckResult.Unhealthy("Database unreachable.");
        }
    }
}
