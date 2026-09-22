namespace AgriLink.API.DTOs.Accounts;

/// <summary>
/// GET /api/users/me/security's whole payload: what the caller's role may change directly versus
/// only request (so the UI shows only what applies), their current phone/NIC, and their own
/// change-request history (pending first, then the 10 most recently decided).
/// </summary>
public class SecuritySettingsResponse
{
    public IReadOnlyList<string> CanChange { get; set; } = Array.Empty<string>();
    public IReadOnlyList<string> CanRequest { get; set; } = Array.Empty<string>();
    public string? PhoneNumber { get; set; }
    public string? NIC { get; set; }
    public IReadOnlyList<ChangeRequestSummary> ChangeRequests { get; set; } = Array.Empty<ChangeRequestSummary>();
}
