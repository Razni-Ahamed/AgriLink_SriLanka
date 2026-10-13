using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services;

/// <summary>How long AI advisories wait for an officer, for the officer and admin dashboards.</summary>
/// <param name="Overdue">Issues whose advisory has waited longer than <see cref="ReviewTiming.OverdueAfter"/>.</param>
/// <param name="OldestPendingHours">How long the longest-waiting advisory has waited; null when none is waiting.</param>
/// <param name="AverageReviewHours">Average time from the AI draft to the officer's decision over the
/// last <see cref="ReviewTiming.AverageWindowDays"/> days; null when nothing was reviewed in that time.</param>
/// <param name="ReviewsInAverage">How many reviews the average is based on.</param>
public record ReviewTimingSummary(int Overdue, double? OldestPendingHours, double? AverageReviewHours, int ReviewsInAverage);

public static class ReviewTiming
{
    /// <summary>A farmer waiting longer than this for an officer is flagged as overdue. The website
    /// uses the same 48 hours (features/issues/lib/reviewTiming.ts).</summary>
    public static readonly TimeSpan OverdueAfter = TimeSpan.FromHours(48);

    public const int AverageWindowDays = 30;

    /// <summary>Advisories still waiting for an officer: the same definition as the review queue.</summary>
    public static IQueryable<AIAdvisory> AwaitingReview(this IQueryable<AIAdvisory> advisories) =>
        advisories.Where(a => a.Status == AdvisoryStatus.Draft || a.Status == AdvisoryStatus.Preliminary);

    /// <param name="awaiting">The advisories waiting in scope (a district, or the whole platform).</param>
    /// <param name="reviewed">The reviewed advisories in scope (one officer's, or everyone's).</param>
    public static async Task<ReviewTimingSummary> SummariseAsync(
        IQueryable<AIAdvisory> awaiting, IQueryable<AIAdvisory> reviewed, DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        var overdueBefore = nowUtc - OverdueAfter;
        var overdue = await awaiting
            .Where(a => a.CreatedAt < overdueBefore)
            .Select(a => a.IssueId)
            .Distinct()
            .CountAsync(cancellationToken);
        var oldest = await awaiting.MinAsync(a => (DateTime?)a.CreatedAt, cancellationToken);

        // A month of reviews is small, so the average is taken here rather than as SQL interval
        // arithmetic, which the in-memory test provider can't run.
        var since = nowUtc.AddDays(-AverageWindowDays);
        var reviews = await reviewed
            .Where(a => a.ReviewedAt != null && a.ReviewedAt >= since)
            .Select(a => new { a.CreatedAt, ReviewedAt = a.ReviewedAt!.Value })
            .ToListAsync(cancellationToken);

        return new ReviewTimingSummary(
            overdue,
            oldest is null ? null : Hours(nowUtc - oldest.Value),
            reviews.Count == 0 ? null : Math.Round(reviews.Average(r => Math.Max(0, (r.ReviewedAt - r.CreatedAt).TotalHours)), 1),
            reviews.Count);
    }

    private static double Hours(TimeSpan span) => Math.Round(Math.Max(0, span.TotalHours), 1);
}
