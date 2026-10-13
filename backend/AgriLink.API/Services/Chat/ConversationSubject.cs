using AgriLink.API.Data;
using AgriLink.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Services.Chat;

/// <summary>The caller, as far as chat access is concerned.</summary>
public sealed record ChatCaller(int UserId, bool IsOfficer, bool IsAdmin, string? OfficerDistrict);

/// <summary>
/// What a conversation is about, and so who takes part in it:
/// <list type="bullet">
/// <item>a deal chat — the farmer whose listing it is and the buyer who sent the request;</item>
/// <item>an advice chat — the farmer who reported the issue, every officer of the farm's district,
/// and any officer who reviewed the issue (the same boundary as reviewing its advisory).</item>
/// </list>
/// Admins are never participants; they may read a conversation only once it has been reported.
/// </summary>
public sealed class ConversationSubject
{
    public ConversationKind Kind { get; init; }
    public int? RequestId { get; init; }
    public int? OrderId { get; init; }
    public int? HarvestId { get; init; }
    public int? IssueId { get; init; }
    public int? AdvisoryId { get; init; }

    /// <summary>Deal: the crop listed. Advice: the issue's title.</summary>
    public string Title { get; init; } = string.Empty;
    public string CropType { get; init; } = string.Empty;
    public decimal? Quantity { get; init; }
    public string District { get; init; } = string.Empty;

    public int FarmerUserId { get; init; }
    public string FarmerName { get; init; } = string.Empty;
    public string? FarmerPhotoUrl { get; init; }

    public int? BuyerUserId { get; init; }
    public string? BuyerName { get; init; }
    public string? BuyerBusinessName { get; init; }
    public string? BuyerPhotoUrl { get; init; }

    /// <summary>Advice: officers who reviewed one of the issue's advisories, wherever they work now.</summary>
    public IReadOnlySet<int> ReviewerUserIds { get; init; } = new HashSet<int>();

    /// <summary>A declined or withdrawn request that never became an order: the chat can be read
    /// but not added to, so a "no" can't turn into a stream of messages.</summary>
    public bool IsClosed { get; init; }

    public bool IsParticipant(ChatCaller caller) => Kind switch
    {
        ConversationKind.Deal => caller.UserId == FarmerUserId || caller.UserId == BuyerUserId,
        _ => caller.UserId == FarmerUserId
             || (caller.IsOfficer
                 && ((caller.OfficerDistrict is not null && string.Equals(caller.OfficerDistrict, District, StringComparison.Ordinal))
                     || ReviewerUserIds.Contains(caller.UserId))),
    };

    /// <summary>"Farmer", "Buyer" or "Officer" for a message's sender.</summary>
    public string RoleOf(int userId) =>
        userId == FarmerUserId ? "Farmer" : Kind == ConversationKind.Deal ? "Buyer" : "Officer";

    public static async Task<ConversationSubject?> ForRequestAsync(AgriLinkDbContext db, int requestId, CancellationToken cancellationToken)
    {
        var request = await db.PurchaseRequests
            .AsNoTracking()
            .Where(r => r.RequestId == requestId)
            .Select(r => new
            {
                r.RequestId,
                r.HarvestId,
                r.Status,
                r.RequestedQuantity,
                OrderId = r.Order != null ? (int?)r.Order.OrderId : null,
                r.Harvest.Crop.CropType,
                r.Harvest.Crop.Field.Farm.District,
                FarmerUserId = r.Harvest.FarmerProfile.UserId,
                FarmerName = r.Harvest.FarmerProfile.User.FullName,
                FarmerPhotoUrl = r.Harvest.FarmerProfile.User.ProfilePhotoUrl,
                BuyerUserId = r.BuyerProfile.UserId,
                BuyerName = r.BuyerProfile.User.FullName,
                r.BuyerProfile.BusinessName,
                BuyerPhotoUrl = r.BuyerProfile.User.ProfilePhotoUrl,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return request is null
            ? null
            : new ConversationSubject
            {
                Kind = ConversationKind.Deal,
                RequestId = request.RequestId,
                OrderId = request.OrderId,
                HarvestId = request.HarvestId,
                Title = request.CropType,
                CropType = request.CropType,
                Quantity = request.RequestedQuantity,
                District = request.District,
                FarmerUserId = request.FarmerUserId,
                FarmerName = request.FarmerName,
                FarmerPhotoUrl = request.FarmerPhotoUrl,
                BuyerUserId = request.BuyerUserId,
                BuyerName = request.BuyerName,
                BuyerBusinessName = request.BusinessName,
                BuyerPhotoUrl = request.BuyerPhotoUrl,
                IsClosed = request.OrderId is null
                    && request.Status is PurchaseRequestStatus.Declined or PurchaseRequestStatus.Cancelled,
            };
    }

    public static async Task<ConversationSubject?> ForIssueAsync(AgriLinkDbContext db, int issueId, CancellationToken cancellationToken)
    {
        var issue = await db.CropIssues
            .AsNoTracking()
            .Where(i => i.IssueId == issueId)
            .Select(i => new
            {
                i.IssueId,
                i.Title,
                i.Crop.CropType,
                i.Crop.Field.Farm.District,
                FarmerUserId = i.FarmerProfile.UserId,
                FarmerName = i.FarmerProfile.User.FullName,
                FarmerPhotoUrl = i.FarmerProfile.User.ProfilePhotoUrl,
                AdvisoryId = i.Advisories.OrderByDescending(a => a.AdvisoryId).Select(a => (int?)a.AdvisoryId).FirstOrDefault(),
                Reviewers = i.Advisories.Where(a => a.ReviewedByFK != null).Select(a => a.ReviewedByFK!.Value).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return issue is null
            ? null
            : new ConversationSubject
            {
                Kind = ConversationKind.Advice,
                IssueId = issue.IssueId,
                AdvisoryId = issue.AdvisoryId,
                Title = issue.Title,
                CropType = issue.CropType,
                District = issue.District,
                FarmerUserId = issue.FarmerUserId,
                FarmerName = issue.FarmerName,
                FarmerPhotoUrl = issue.FarmerPhotoUrl,
                ReviewerUserIds = issue.Reviewers.ToHashSet(),
            };
    }

    public static Task<ConversationSubject?> ForConversationAsync(AgriLinkDbContext db, Conversation conversation, CancellationToken cancellationToken) =>
        conversation.Kind == ConversationKind.Deal
            ? ForRequestAsync(db, conversation.RequestId!.Value, cancellationToken)
            : ForIssueAsync(db, conversation.IssueId!.Value, cancellationToken);

    /// <summary>Everyone but <paramref name="senderUserId"/> who should hear about a new message.</summary>
    public async Task<List<int>> RecipientsAsync(AgriLinkDbContext db, int senderUserId, CancellationToken cancellationToken)
    {
        if (Kind == ConversationKind.Deal)
        {
            return new[] { FarmerUserId, BuyerUserId!.Value }.Where(id => id != senderUserId).ToList();
        }

        if (senderUserId != FarmerUserId)
        {
            return new List<int> { FarmerUserId };
        }

        var districtOfficers = await db.OfficerProfiles
            .Where(o => o.District == District)
            .Select(o => o.UserId)
            .ToListAsync(cancellationToken);
        return districtOfficers.Concat(ReviewerUserIds).Distinct().Where(id => id != senderUserId).ToList();
    }
}
