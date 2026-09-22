using System.Text.Json.Serialization;

namespace AgriLink.API.DTOs.Users;

/// <summary>Deliberately carries nothing about who holds a taken username.</summary>
public class UsernameAvailabilityResponse
{
    public bool Available { get; set; }

    /// <summary>"invalid", "reserved" or "taken"; omitted when the username is available.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Reason { get; set; }
}
