namespace AgriLink.API.DTOs.Harvests;

/// <summary>What buyers recently paid for a crop, from completed orders, to help a farmer price a listing.</summary>
public class PriceGuideResponse
{
    public string CropType { get; set; } = string.Empty;
    public string? District { get; set; }
    public int WindowDays { get; set; }

    /// <summary>Fewer completed sales than this and no figures are given: too few to be a guide, and
    /// one or two would reveal individual buyers' deals.</summary>
    public int MinimumSales { get; set; }

    /// <summary>Sales of this crop from farms in <see cref="District"/>; null below <see cref="MinimumSales"/>.</summary>
    public PriceStats? InDistrict { get; set; }

    /// <summary>Sales of this crop anywhere in Sri Lanka; null below <see cref="MinimumSales"/>.</summary>
    public PriceStats? Nationwide { get; set; }
}

public class PriceStats
{
    public int Sales { get; set; }
    public decimal TotalQuantity { get; set; }

    /// <summary>Weighted by quantity, so a 1 kg sale doesn't count as much as a 500 kg one.</summary>
    public decimal AveragePricePerUnit { get; set; }

    public decimal MinPricePerUnit { get; set; }
    public decimal MaxPricePerUnit { get; set; }
}
