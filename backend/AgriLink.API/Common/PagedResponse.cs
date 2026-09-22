namespace AgriLink.API.Common;

/// <summary>
/// Uniform page envelope for any list endpoint. Callers that used to get a bare array now get
/// this instead — a breaking change for the paged endpoints, made once across all of them
/// together rather than piecemeal.
/// </summary>
public class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
}
