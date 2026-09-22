namespace AgriLink.API.Services.Accounts;

/// <summary>
/// Column lengths for the fields a user can edit on their own profile. The DbContext configures the
/// columns from these and the profile endpoints validate against them, so the two cannot drift apart
/// and an over-long value is refused with a 400 rather than failing the insert with a 500.
/// </summary>
public static class ProfileFieldLimits
{
    public const int DisplayName = 60;
    public const int ProfilePhotoUrl = 500;
    public const int ProfilePhotoKey = 300;
    public const int FieldPlotNumber = 50;
    public const int BusinessName = 100;
}
