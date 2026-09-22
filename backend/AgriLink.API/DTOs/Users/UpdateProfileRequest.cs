using System.ComponentModel.DataAnnotations;
using AgriLink.API.Services.Accounts;

namespace AgriLink.API.DTOs.Users;

/// <summary>
/// Everything a user may change about themselves from the General tab — and nothing else, so no
/// other property of the account can be set through this endpoint whatever JSON is sent (unknown
/// properties are ignored). A property that is null or absent keeps its current value.
///
/// The length limits here are on the raw input; UsersController.UpdateProfile re-checks them after
/// trimming, against the same column lengths.
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>An empty string clears it, so the UI falls back to the full name.</summary>
    [MaxLength(ProfileFieldLimits.DisplayName * 2)]
    public string? DisplayName { get; set; }

    [MaxLength(256)]
    public string? Username { get; set; }

    /// <summary>Farmer accounts only.</summary>
    [MaxLength(ProfileFieldLimits.FieldPlotNumber * 2)]
    public string? FieldPlotNumber { get; set; }

    /// <summary>Buyer accounts only.</summary>
    [MaxLength(ProfileFieldLimits.BusinessName * 2)]
    public string? BusinessName { get; set; }
}
