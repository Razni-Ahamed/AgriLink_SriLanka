namespace AgriLink.API.DTOs.Harvests;

/// <summary>
/// Upper bounds for marketplace numbers. The columns are decimal(10,2), and anything larger used to
/// pass validation and then fail in the database with a 500. A million kg matches the limit a crop's
/// expected quantity already has.
/// </summary>
public static class HarvestLimits
{
    public const double MaxQuantityKg = 1_000_000;
    public const double MaxPricePerKg = 1_000_000;
}
