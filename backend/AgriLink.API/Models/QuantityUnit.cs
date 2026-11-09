using System.Globalization;

namespace AgriLink.API.Models;

/// <summary>
/// What a listing's quantity and price are counted in, so a price reads "Rs 120/kg" rather than
/// "Rs 120/unit". Stored as text. Listings from before units existed were priced per kg, and a client
/// that doesn't send a unit (an older app) gets Kg.
/// </summary>
public enum QuantityUnit
{
    Kg,
    Piece,
    Bunch,
    Sack,
    Crate,
}

public static class QuantityUnits
{
    /// <summary>"12.5 kg", "1 piece", "3 bunches" — for notification text, which is in English.</summary>
    public static string Describe(decimal quantity, QuantityUnit unit)
    {
        var amount = quantity.ToString("0.##", CultureInfo.InvariantCulture);
        var one = quantity == 1;
        var word = unit switch
        {
            QuantityUnit.Kg => "kg",
            QuantityUnit.Piece => one ? "piece" : "pieces",
            QuantityUnit.Bunch => one ? "bunch" : "bunches",
            QuantityUnit.Sack => one ? "sack" : "sacks",
            QuantityUnit.Crate => one ? "crate" : "crates",
            _ => "units",
        };
        return $"{amount} {word}";
    }
}
