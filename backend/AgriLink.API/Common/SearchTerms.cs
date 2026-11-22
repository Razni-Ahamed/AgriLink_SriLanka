namespace AgriLink.API.Common;

public static class SearchTerms
{
    /// <summary>
    /// Trigram indexes only help with terms of at least three characters. Shorter terms keep the
    /// single OR query, which is quicker than the per-table union when no index applies.
    /// </summary>
    public const int MinIndexedLength = 3;
}
