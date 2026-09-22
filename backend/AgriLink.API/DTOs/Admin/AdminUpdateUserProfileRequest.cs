namespace AgriLink.API.DTOs.Admin;

/// <summary>
/// Allowed-fields DTO for PUT /api/admin/users/{id}/profile — deliberately not the entity, so
/// role, IsActive, RegistrationStatus, the password hash and the security stamp can never be set
/// through this endpoint no matter what the request body contains.
///
/// Every field is optional: null (absent from the JSON body) means "leave this alone". A field
/// that does accept clearing (only PhoneNumber, for Officer/Admin) is cleared by sending "",
/// which is not null.
/// </summary>
public class AdminUpdateUserProfileRequest
{
    public string? FullName { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }

    /// <summary>Farmer/Buyer only.</summary>
    public string? NIC { get; set; }

    /// <summary>Farmer/Buyer/Officer only.</summary>
    public string? District { get; set; }

    /// <summary>Buyer only.</summary>
    public string? BusinessRegistrationNumber { get; set; }

    /// <summary>Buyer only.</summary>
    public string? BusinessName { get; set; }

    /// <summary>Farmer only.</summary>
    public string? FieldPlotNumber { get; set; }
}
