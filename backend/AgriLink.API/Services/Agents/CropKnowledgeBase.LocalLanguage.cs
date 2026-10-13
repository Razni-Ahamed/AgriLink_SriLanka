using System.Text;

namespace AgriLink.API.Services.Agents;

// Sinhala and Tamil words for the same symptoms, so a report written in either language can match
// a rule instead of always falling back to "no matching pattern". They are merged into each rule's
// English keywords when Entries is built (CropKnowledgeBase.cs).
//
// DRAFT: these were written for the system and still need checking by native Sinhala and Tamil
// speakers who know farmers' own words (ideally agricultural officers). Words that are too short or
// too general are avoided on purpose — "කහ" alone also means turmeric, "மஞ்சள்" too — because a
// false match gives the officer a wrong lead. CropKnowledgeBaseLocalLanguageTests checks that every
// key below names a real rule.
public static partial class CropKnowledgeBase
{
    /// <summary>Extra keywords per rule, keyed by the rule's English PossibleCause.</summary>
    // A method, not a field: static field initialisers in different files of a partial class run in
    // no guaranteed order, and Entries (in the other file) is built from this.
    public static IReadOnlyDictionary<string, string[]> LocalLanguageKeywords() => new Dictionary<string, string[]>
    {
        ["Nitrogen deficiency showing first on the older, lower leaves"] = new[]
        {
            "කහ පාට", "කහ වෙලා", "කහ වී", "කහ වෙනවා", "කොළ කහ",
            "மஞ்சளாக", "மஞ்சள் நிற", "இலைகள் மஞ்சள்", "மஞ்சளாகி",
        },
        ["Overwatering / waterlogged soil starving the roots of oxygen"] = new[]
        {
            "වතුර පිරිලා", "වතුර බහින්නේ නැහැ", "වතුර රැඳිලා", "ජලය රැඳී",
            "தண்ணீர் தேங்கி", "நீர் தேக்கம்", "நீர் வடியவில்லை",
        },
        ["Underwatering / soil moisture stress"] = new[]
        {
            "පස වියළී", "පස වේළී", "වතුර නැහැ", "වැස්සක් නැහැ", "නියඟය",
            "மண் காய்ந்து", "தண்ணீர் இல்லை", "வறட்சி", "மழை இல்லை",
        },
        ["General nutrient deficiency or compacted, poor soil limiting root development"] = new[]
        {
            "වැඩෙන්නේ නැහැ", "වර්ධනය නැහැ", "කුරු වෙලා",
            "வளரவில்லை", "வளர்ச்சி குறைவு", "குட்டையாக",
        },
        ["Phosphorus deficiency (often worse in cold or waterlogged soil)"] = new[]
        {
            "දම් පාට", "රතු පාට කොළ",
            "ஊதா நிற", "சிவப்பு இலை",
        },
        ["Potassium deficiency or heat stress scorching the leaf margins"] = new[]
        {
            "දාර වියළී", "කොළ දාර", "පිළිස්සිලා", "පිළිස්සී",
            "இலை ஓரங்கள்", "ஓரங்கள் காய்ந்து", "கருகி",
        },
        ["Root rot or a vascular wilt disease restricting water uptake"] = new[]
        {
            "මැලවී", "මැලවෙනවා", "මැලවෙලා",
            "வாடி", "வாடுகிறது", "வாடல்",
        },
        ["Powdery mildew, a fungal infection favoured by humid air and poor ventilation"] = new[]
        {
            "සුදු කුඩු", "පිටි වගේ",
            "வெள்ளை பொடி", "சாம்பல் நோய்",
        },
        ["Fungal leaf blight or leaf spot disease spreading in wet foliage"] = new[]
        {
            "කළු ලප", "දුඹුරු ලප", "කොළ පුල්ලි", "අංගමාරය",
            "கருப்பு புள்ளி", "இலைப்புள்ளி", "பழுப்பு புள்ளி", "கருகல் நோய்",
        },
        ["Fungal fruit rot developing under excess moisture"] = new[]
        {
            "ගෙඩි කුණු", "ගෙඩි කුණුවෙලා",
            "பழ அழுகல்", "காய் அழுகல்",
        },
        ["Grey mould / saprophytic fungal growth on damaged or over-humid tissue"] = new[]
        {
            "පුස් බැඳිලා", "පුස් හැදිලා",
            "பூஞ்சணம்", "பூஞ்சை வளர்ந்து",
        },
        ["Collar or stem rot at the soil line caused by a soil-borne fungus in wet conditions"] = new[]
        {
            "කඳ කුණු", "පැළ ඇදවැටෙනවා", "පැළ කුණු",
            "தண்டு அழுகல்", "நாற்று அழுகல்",
        },
        ["Chewing pest damage from caterpillars, armyworm or leaf-eating beetles"] = new[]
        {
            "දළඹුවන්", "දළඹුවා", "කොළ කාලා", "පණුවන්",
            "புழுக்கள்", "கம்பளிப்புழு", "இலைகளை தின்று", "இலைகளில் ஓட்டை",
        },
        ["Aphid or whitefly feeding, or a virus spread by those insects"] = new[]
        {
            "කොළ කොඩ", "කොළ හැකිළී", "සුදු මැස්සා",
            "இலை சுருள்", "சுருண்டு", "அசுவினி", "வெள்ளை ஈ",
        },
        ["Stem borer larvae tunnelling inside the stem"] = new[]
        {
            "කඳ විදින", "කඳේ සිදුරු", "මැද කොළය මැරී",
            "தண்டு துளைப்பான்", "குருத்து காய்ந்து",
        },
        ["Thrips feeding, which scrapes the leaf surface and can transmit viruses"] = new[]
        {
            "ත්‍රිප්ස්", "රිදී පැහැ",
            "இலைப்பேன்", "வெள்ளி நிற",
        },
        ["Brown planthopper infestation causing hopperburn patches"] = new[]
        {
            "කීඩෑවා", "ගොයම පිළිස්සී",
            "புகையான்", "தத்துப்பூச்சி",
        },
        ["Rice blast (Pyricularia oryzae), a fungal disease favoured by high humidity and heavy dew"] = new[]
        {
            "දියමන්ති හැඩ", "බෙල්ල කුණු", "කරල සුදු",
            "குலை நோய்", "குலைநோய்", "கழுத்து அழுகல்",
        },
        ["Blossom-end rot caused by poor calcium uptake from uneven soil moisture"] = new[]
        {
            "ගෙඩියේ පතුල කළු",
            "பூ முனை அழுகல்", "அடிப்பகுதி கருப்பு",
        },
        ["Fruit borer larvae feeding inside the developing fruit"] = new[]
        {
            "ගෙඩි විදින", "ගෙඩිය ඇතුළේ පණුවා",
            "காய் துளைப்பான்", "காய்க்குள் புழு",
        },
        ["Panama disease (Fusarium wilt), a soil-borne fungus affecting the vascular system"] = new[]
        {
            "පැනමා",
            "பனாமா வாடல்",
        },
        ["Rhinoceros beetle damage to the crown and young fronds"] = new[]
        {
            "කළු කුරුමිණියා", "කුරුමිණියා",
            "காண்டாமிருக வண்டு",
        },
    };

    /// <summary>
    /// Text in the form both a report and a keyword are compared in. Sinhala conjuncts are typed with
    /// or without zero-width joiners (ශ්‍ර / ශ්ර) depending on the keyboard, so those are removed, and
    /// the text is put in one Unicode normal form. English text is only lower-cased, as before.
    /// </summary>
    public static string NormalizeForMatching(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormC);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (c is not ('‌' or '‍'))
            {
                builder.Append(c);
            }
        }

        return builder.ToString().ToLowerInvariant();
    }

    private static CropKnowledgeEntry WithLocalLanguageKeywords(CropKnowledgeEntry entry, IReadOnlyDictionary<string, string[]> local) =>
        local.TryGetValue(entry.PossibleCause, out var extra)
            ? entry with { Keywords = entry.Keywords.Concat(extra.Select(NormalizeForMatching)).ToArray() }
            : entry;
}
