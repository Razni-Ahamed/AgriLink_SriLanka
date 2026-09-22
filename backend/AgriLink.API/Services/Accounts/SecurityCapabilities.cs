namespace AgriLink.API.Services.Accounts;

/// <summary>
/// The role matrix from the design doc, in one place so GET /api/users/me/security and every
/// endpoint that acts on a field agree about what each role may change directly versus only
/// request. Field names here are the camelCase strings the frontend matches against; "nic" and
/// "email" here are requestable ("email" for Admin is also directly changeable — see CanChange).
/// </summary>
public static class SecurityCapabilities
{
    public static (IReadOnlyList<string> CanChange, IReadOnlyList<string> CanRequest) For(string role) => role switch
    {
        "Farmer" or "Buyer" => (
            new[] { "password", "phone" },
            new[] { "fullName", "nic", "email" }),
        "Officer" => (
            new[] { "password", "phone" },
            new[] { "fullName", "email" }),
        // No approver sits above an Admin, so full name and email are direct changes here too —
        // CanRequest is empty.
        "Admin" => (
            new[] { "password", "phone", "fullName", "email" },
            Array.Empty<string>()),
        _ => (Array.Empty<string>(), Array.Empty<string>()),
    };
}
