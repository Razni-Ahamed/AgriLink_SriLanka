using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Common;

/// <summary>
/// The one place that clamps page/pageSize and runs the CountAsync + Skip/Take pair, so every
/// paged endpoint clamps and counts the same way instead of five slightly different copies.
/// </summary>
public static class PagingExtensions
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    /// <summary>
    /// Pages an already-filtered-and-ordered query. Invalid page/pageSize values are clamped,
    /// never rejected — page &lt; 1 becomes 1, pageSize is clamped to [1, 100].
    /// </summary>
    public static async Task<PagedResponse<T>> ToPagedResponseAsync<T>(
        this IQueryable<T> orderedQuery, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var clampedPage = Math.Max(page, 1);
        var clampedPageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var totalCount = await orderedQuery.CountAsync(cancellationToken);
        var items = await orderedQuery
            .Skip((clampedPage - 1) * clampedPageSize)
            .Take(clampedPageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<T>
        {
            Items = items,
            Page = clampedPage,
            PageSize = clampedPageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)clampedPageSize),
        };
    }

    /// <summary>Projects a page of one shape into a page of another (entity to DTO), keeping the paging metadata.</summary>
    public static PagedResponse<TResult> Map<T, TResult>(this PagedResponse<T> source, Func<T, TResult> selector) => new()
    {
        Items = source.Items.Select(selector).ToList(),
        Page = source.Page,
        PageSize = source.PageSize,
        TotalCount = source.TotalCount,
        TotalPages = source.TotalPages,
    };
}
