using System.Globalization;
using AgriLink.API.Models;

namespace AgriLink.API.Services.Sms;

/// <summary>
/// Crop names and quantity words for Sinhala and Tamil alerts, copied from the website's own
/// translations (frontend/src/i18n/locales/{si,ta}/common.json: <c>cropTypes</c> and
/// <c>units.quantity</c>), so those texts don't carry English words like "Tomato" or "20 bunches".
/// A crop that isn't listed keeps the name it was given.
/// </summary>
public static class SmsWords
{
    /// <summary>The crop's name in <paramref name="language"/>; English, or an unknown crop, stays as given.</summary>
    public static string Crop(string cropType, string? language)
    {
        var names = language switch
        {
            SmsText.Sinhala => SinhalaCrops,
            SmsText.Tamil => TamilCrops,
            _ => null,
        };
        return names is not null && names.TryGetValue(cropType.Trim(), out var name) ? name : cropType;
    }

    /// <summary>"20 kg" / "20 කි.ග්‍රෑ." / Tamil equivalent, for the amount in an alert.</summary>
    public static string Amount(decimal quantity, QuantityUnit unit, string? language)
    {
        var patterns = language switch
        {
            SmsText.Sinhala => SinhalaAmounts,
            SmsText.Tamil => TamilAmounts,
            _ => null,
        };
        if (patterns is null || !patterns.TryGetValue(unit, out var pattern))
        {
            return QuantityUnits.Describe(quantity, unit);
        }

        var amount = quantity.ToString("0.##", CultureInfo.InvariantCulture);
        return string.Format(CultureInfo.InvariantCulture, quantity == 1 ? pattern.One : pattern.Other, amount);
    }

    private static readonly Dictionary<string, string> SinhalaCrops = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Tea"] = "තේ",
        ["Rubber"] = "රබර්",
        ["Coconut"] = "පොල්",
        ["Cinnamon"] = "කුරුඳු",
        ["Pepper"] = "ගම්මිරිස්",
        ["Cardamom"] = "එනසාල්",
        ["Sugarcane"] = "උක්",
        ["Paddy"] = "වී",
        ["Maize"] = "බඩඉරිඟු",
        ["Green Gram"] = "මුං",
        ["Cowpea"] = "කව්පි",
        ["Groundnut"] = "රටකජු",
        ["Soybean"] = "සෝයා",
        ["Potato"] = "අර්තාපල්",
        ["Sweet Potato"] = "බතල",
        ["Cassava"] = "මඤ්ඤොක්කා",
        ["Onion"] = "ලූනු",
        ["Tomato"] = "තක්කාලි",
        ["Chilli"] = "මිරිස්",
        ["Brinjal"] = "වම්බටු",
        ["Okra"] = "බණ්ඩක්කා",
        ["Cabbage"] = "ගෝවා",
        ["Carrot"] = "කැරට්",
        ["Beans"] = "බෝංචි",
        ["Pumpkin"] = "වට්ටක්කා",
        ["Cucumber"] = "පිපිඤ්ඤා",
        ["Leeks"] = "ලීක්ස්",
        ["Beetroot"] = "බීට්රූට්",
        ["Banana"] = "කෙසෙල්",
        ["Mango"] = "අඹ",
        ["Pineapple"] = "අන්නාසි",
        ["Papaya"] = "පැපොල්",
        ["Avocado"] = "අලිගැට පේර",
        ["Passion Fruit"] = "පැෂන් ෆෘට්",
        ["Other"] = "වෙනත්",
    };

    private static readonly Dictionary<string, string> TamilCrops = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Tea"] = "தேயிலை",
        ["Rubber"] = "இறப்பர்",
        ["Coconut"] = "தென்னை",
        ["Cinnamon"] = "இலவங்கப்பட்டை",
        ["Pepper"] = "மிளகு",
        ["Cardamom"] = "ஏலக்காய்",
        ["Sugarcane"] = "கரும்பு",
        ["Paddy"] = "நெல்",
        ["Maize"] = "மக்காச்சோளம்",
        ["Green Gram"] = "பச்சைப் பயறு",
        ["Cowpea"] = "காராமணி",
        ["Groundnut"] = "நிலக்கடலை",
        ["Soybean"] = "சோயா",
        ["Potato"] = "உருளைக்கிழங்கு",
        ["Sweet Potato"] = "சர்க்கரைவள்ளிக்கிழங்கு",
        ["Cassava"] = "மரவள்ளிக்கிழங்கு",
        ["Onion"] = "வெங்காயம்",
        ["Tomato"] = "தக்காளி",
        ["Chilli"] = "மிளகாய்",
        ["Brinjal"] = "கத்தரிக்காய்",
        ["Okra"] = "வெண்டைக்காய்",
        ["Cabbage"] = "முட்டைக்கோஸ்",
        ["Carrot"] = "கேரட்",
        ["Beans"] = "பீன்ஸ்",
        ["Pumpkin"] = "பூசணி",
        ["Cucumber"] = "வெள்ளரி",
        ["Leeks"] = "லீக்ஸ்",
        ["Beetroot"] = "பீட்ரூட்",
        ["Banana"] = "வாழை",
        ["Mango"] = "மாம்பழம்",
        ["Pineapple"] = "அன்னாசி",
        ["Papaya"] = "பப்பாளி",
        ["Avocado"] = "வெண்ணெய்ப்பழம்",
        ["Passion Fruit"] = "பேஷன் பழம்",
        ["Other"] = "மற்றவை",
    };

    // {0} is the amount.
    private static readonly Dictionary<QuantityUnit, (string One, string Other)> SinhalaAmounts = new()
    {
        [QuantityUnit.Kg] = ("{0} කි.ග්‍රෑ.", "{0} කි.ග්‍රෑ."),
        [QuantityUnit.Piece] = ("ගෙඩි {0}", "ගෙඩි {0}"),
        [QuantityUnit.Bunch] = ("කැන {0}", "කැන {0}"),
        [QuantityUnit.Sack] = ("ගෝනි {0}", "ගෝනි {0}"),
        [QuantityUnit.Crate] = ("පෙට්ටි {0}", "පෙට්ටි {0}"),
    };

    // {0} is the amount.
    private static readonly Dictionary<QuantityUnit, (string One, string Other)> TamilAmounts = new()
    {
        [QuantityUnit.Kg] = ("{0} கி.கி.", "{0} கி.கி."),
        [QuantityUnit.Piece] = ("{0} எண்ணிக்கை", "{0} எண்ணிக்கை"),
        [QuantityUnit.Bunch] = ("{0} குலை", "{0} குலைகள்"),
        [QuantityUnit.Sack] = ("{0} மூட்டை", "{0} மூட்டைகள்"),
        [QuantityUnit.Crate] = ("{0} பெட்டி", "{0} பெட்டிகள்"),
    };
}
