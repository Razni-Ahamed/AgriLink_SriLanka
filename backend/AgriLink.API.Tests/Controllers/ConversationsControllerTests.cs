using AgriLink.API.Common;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Conversations;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Tests.Controllers;

/// <summary>
/// Chat about a purchase request (farmer and buyer) or a crop issue (farmer and the district's
/// officers): who may open, read and post; notifications; unread counts; and reporting.
/// </summary>
public class ConversationsControllerTests
{
    private const int Farmer = 10;
    private const int OtherFarmer = 11;
    private const int Buyer = 20;
    private const int OtherBuyer = 21;
    private const int KandyOfficer = 30;
    private const int SecondKandyOfficer = 31;
    private const int GalleOfficer = 32;
    private const int Admin = 40;

    private const int PendingRequest = 1;
    private const int DeclinedRequest = 2;
    private const int Issue = 1;

    private static AgriLinkDbContext SeedDb()
    {
        var db = new AgriLinkDbContext(new DbContextOptionsBuilder<AgriLinkDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        foreach (var (id, name) in new[]
                 {
                     (Farmer, "Nimal Perera"), (OtherFarmer, "Sunil Silva"), (Buyer, "Kamala Stores"),
                     (OtherBuyer, "Other Buyer"), (KandyOfficer, "Officer Kandy"), (SecondKandyOfficer, "Officer Kandy Two"),
                     (GalleOfficer, "Officer Galle"), (Admin, "Admin"),
                 })
        {
            db.Users.Add(new ApplicationUser { Id = id, UserName = $"u{id}", Email = $"u{id}@test.lk", FullName = name });
        }

        db.Roles.Add(new IdentityRole<int> { Id = 1, Name = "Admin", NormalizedName = "ADMIN" });
        db.UserRoles.Add(new IdentityUserRole<int> { UserId = Admin, RoleId = 1 });

        db.FarmerProfiles.AddRange(
            new FarmerProfile { FarmerProfileId = 1, UserId = Farmer, NIC = "1", District = "Kandy" },
            new FarmerProfile { FarmerProfileId = 2, UserId = OtherFarmer, NIC = "2", District = "Kandy" });
        db.BuyerProfiles.AddRange(
            new BuyerProfile { BuyerProfileId = 1, UserId = Buyer, BusinessName = "Kamala Stores", District = "Colombo" },
            new BuyerProfile { BuyerProfileId = 2, UserId = OtherBuyer, BusinessName = "Other", District = "Colombo" });
        db.Departments.Add(new Department { DepartmentId = 1, Name = "Extension" });
        db.OfficerProfiles.AddRange(
            new OfficerProfile { OfficerProfileId = 1, UserId = KandyOfficer, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 2, UserId = SecondKandyOfficer, DepartmentId = 1, District = "Kandy" },
            new OfficerProfile { OfficerProfileId = 3, UserId = GalleOfficer, DepartmentId = 1, District = "Galle" });

        var crop = new Crop
        {
            CropId = 1,
            CropType = "Tomato",
            Field = new Field { FieldId = 1, Name = "F", Farm = new Farm { FarmId = 1, Name = "Hill Farm", District = "Kandy", FarmerProfileId = 1 } },
        };
        var listing = new HarvestListing
        {
            HarvestId = 1, FarmerProfileId = 1, Crop = crop, Quantity = 500, AvailableQuantity = 500, PricePerUnit = 120, Location = "Kandy",
        };
        db.HarvestListings.Add(listing);
        db.PurchaseRequests.AddRange(
            new PurchaseRequest { RequestId = PendingRequest, Harvest = listing, BuyerProfileId = 1, RequestedQuantity = 50, PricePerUnit = 120 },
            new PurchaseRequest { RequestId = DeclinedRequest, Harvest = listing, BuyerProfileId = 1, RequestedQuantity = 20, PricePerUnit = 120, Status = PurchaseRequestStatus.Declined });
        db.CropIssues.Add(new CropIssue
        {
            IssueId = Issue, FarmerProfileId = 1, Crop = crop, Title = "Leaves curling", Description = "d",
            // Reviewed earlier by the Galle officer (since moved district): still part of the chat.
            Advisories = { new AIAdvisory { AdvisoryId = 5, Status = AdvisoryStatus.Approved, ReviewedByFK = GalleOfficer, ReviewedAt = DateTime.UtcNow } },
        });

        db.SaveChanges();
        return db;
    }

    private static ConversationsController As(AgriLinkDbContext db, int userId, string role) => new(
        db, new CurrentUserService(db), new NotificationService(db), new AuditLogService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(userId, role) },
        },
    };

    private static ConversationsController Farmer_(AgriLinkDbContext db) => As(db, Farmer, "Farmer");
    private static ConversationsController Buyer_(AgriLinkDbContext db) => As(db, Buyer, "Buyer");

    private static T Value<T>(ActionResult<T> result) =>
        result.Value ?? (T)((ObjectResult)result.Result!).Value!;

    private static async Task<int> DealChatAsync(AgriLinkDbContext db) =>
        Value(await Farmer_(db).StartDeal(PendingRequest, CancellationToken.None)).ConversationId;

    private static async Task<int> AdviceChatAsync(AgriLinkDbContext db) =>
        Value(await Farmer_(db).StartAdvice(Issue, CancellationToken.None)).ConversationId;

    private static Task<ActionResult<ConversationMessageResponse>> SendAsync(ConversationsController controller, int conversationId, string body) =>
        controller.Send(conversationId, new SendConversationMessageRequest { Body = body }, CancellationToken.None);

    // ----- Deal chat -----

    [Fact]
    public async Task DealChat_IsCreatedOnce_AndSharedByTheFarmerAndTheBuyer()
    {
        using var db = SeedDb();

        var created = await Farmer_(db).StartDeal(PendingRequest, CancellationToken.None);
        var again = await Buyer_(db).StartDeal(PendingRequest, CancellationToken.None);

        Assert.Equal(StatusCodes.Status201Created, Assert.IsType<ObjectResult>(created.Result).StatusCode);
        var forBuyer = Assert.IsType<ConversationResponse>(Assert.IsType<OkObjectResult>(again.Result).Value);
        Assert.Equal(Value(created).ConversationId, forBuyer.ConversationId);
        Assert.Single(db.Conversations);

        var forFarmer = Value(created);
        Assert.Equal("Buyer", forFarmer.CounterpartRole);
        Assert.Equal("Kamala Stores", forFarmer.CounterpartName);
        Assert.Equal("Farmer", forBuyer.CounterpartRole);
        Assert.Equal("Nimal Perera", forBuyer.CounterpartName);
        Assert.Equal("Tomato", forBuyer.Title);
        Assert.Equal(50, forBuyer.Quantity);
        Assert.True(forBuyer.CanSend);
    }

    [Theory]
    [InlineData(OtherFarmer, "Farmer")]
    [InlineData(OtherBuyer, "Buyer")]
    [InlineData(KandyOfficer, "Officer")]
    [InlineData(Admin, "Admin")]
    public async Task DealChat_IsClosedToAnyoneOutsideTheDeal(int userId, string role)
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);
        var outsider = As(db, userId, role);

        Assert.IsType<ForbidResult>((await outsider.StartDeal(PendingRequest, CancellationToken.None)).Result);
        Assert.IsType<ForbidResult>((await outsider.Get(conversationId, CancellationToken.None)).Result);
        Assert.IsType<ForbidResult>((await outsider.Messages(conversationId, null, CancellationToken.None)).Result);
        Assert.IsType<ForbidResult>((await SendAsync(outsider, conversationId, "hello")).Result);
    }

    [Fact]
    public async Task DealChat_CannotBeStartedAboutADeclinedRequest()
    {
        using var db = SeedDb();

        var result = await Buyer_(db).StartDeal(DeclinedRequest, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(db.Conversations);
    }

    [Fact]
    public async Task DealChat_BecomesReadOnly_WhenTheRequestIsDeclined()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);
        Assert.IsType<ObjectResult>((await SendAsync(Buyer_(db), conversationId, "Can you do 110?")).Result);
        (await db.PurchaseRequests.SingleAsync(r => r.RequestId == PendingRequest)).Status = PurchaseRequestStatus.Declined;
        await db.SaveChangesAsync();

        var reopened = Value(await Buyer_(db).Get(conversationId, CancellationToken.None));
        var send = await SendAsync(Buyer_(db), conversationId, "Please reconsider");

        Assert.True(reopened.IsClosed);
        Assert.False(reopened.CanSend);
        Assert.IsType<BadRequestObjectResult>(send.Result);
        Assert.Single(Value(await Buyer_(db).Messages(conversationId, null, CancellationToken.None)).Items);
    }

    // ----- Advice chat -----

    [Fact]
    public async Task AdviceChat_IncludesTheDistrictsOfficersAndPastReviewers_ButNoOneElse()
    {
        using var db = SeedDb();
        var conversationId = await AdviceChatAsync(db);

        Assert.IsType<OkObjectResult>((await As(db, KandyOfficer, "Officer").StartAdvice(Issue, CancellationToken.None)).Result);
        Assert.IsType<OkObjectResult>((await As(db, SecondKandyOfficer, "Officer").Get(conversationId, CancellationToken.None)).Result);
        Assert.IsType<OkObjectResult>((await As(db, GalleOfficer, "Officer").Get(conversationId, CancellationToken.None)).Result);

        db.AIAdvisories.Single().ReviewedByFK = null; // not a reviewer any more, and not in Kandy
        await db.SaveChangesAsync();
        Assert.IsType<ForbidResult>((await As(db, GalleOfficer, "Officer").Get(conversationId, CancellationToken.None)).Result);
        Assert.IsType<ForbidResult>((await As(db, OtherFarmer, "Farmer").StartAdvice(Issue, CancellationToken.None)).Result);
        Assert.IsType<ForbidResult>((await Buyer_(db).StartAdvice(Issue, CancellationToken.None)).Result);
    }

    [Fact]
    public async Task AdviceChat_AFarmersMessageReachesEveryOfficerInvolved_AndAnOfficersReplyReachesTheFarmer()
    {
        using var db = SeedDb();
        var conversationId = await AdviceChatAsync(db);

        await SendAsync(Farmer_(db), conversationId, "The curling is spreading. Should I remove the plants?");
        var notifiedOfficers = db.Notifications.Select(n => n.UserId).OrderBy(id => id).ToList();
        await SendAsync(As(db, KandyOfficer, "Officer"), conversationId, "Remove the worst ones and send a photo.");

        Assert.Equal(new[] { KandyOfficer, SecondKandyOfficer, GalleOfficer }, notifiedOfficers);
        var toFarmer = Assert.Single(db.Notifications.Where(n => n.UserId == Farmer));
        Assert.Equal("New message from Officer Kandy", toFarmer.Title);
        Assert.Contains("Leaves curling", toFarmer.Message);

        var forFarmer = Value(await Farmer_(db).Get(conversationId, CancellationToken.None));
        Assert.Equal("Officer", forFarmer.CounterpartRole);
        Assert.Null(forFarmer.CounterpartName); // the district's officers, not one person
        var messages = Value(await Farmer_(db).Messages(conversationId, null, CancellationToken.None)).Items;
        Assert.Equal(new[] { "Farmer", "Officer" }, messages.Select(m => m.SenderRole));
        Assert.Equal(new[] { true, false }, messages.Select(m => m.IsMine));
    }

    // ----- Messages, unread, notifications -----

    [Fact]
    public async Task Send_NotifiesOnlyForTheFirstUnreadMessage_UntilTheRecipientReadsTheChat()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);

        await SendAsync(Farmer_(db), conversationId, "Hello");
        await SendAsync(Farmer_(db), conversationId, "Are you still interested?");
        Assert.Single(db.Notifications.Where(n => n.UserId == Buyer));

        Assert.IsType<NoContentResult>(await Buyer_(db).MarkRead(conversationId, CancellationToken.None));
        await SendAsync(Farmer_(db), conversationId, "I can deliver on Friday");

        Assert.Equal(2, db.Notifications.Count(n => n.UserId == Buyer));
        Assert.Empty(db.Notifications.Where(n => n.UserId == Farmer));
    }

    [Fact]
    public async Task UnreadCountsAndTheChatList_FollowWhatEachPersonHasRead()
    {
        using var db = SeedDb();
        var deal = await DealChatAsync(db);
        var advice = await AdviceChatAsync(db);
        await Buyer_(db).StartDeal(PendingRequest, CancellationToken.None);
        await SendAsync(Buyer_(db), deal, "Can you do 110 a kg?");
        await SendAsync(Buyer_(db), deal, "For all 50 kg");
        await SendAsync(As(db, KandyOfficer, "Officer"), advice, "Please send a closer photo\nof the leaves.");

        Assert.Equal(3, Value(await Farmer_(db).UnreadCount(CancellationToken.None)).Count);
        Assert.Equal(0, Value(await Buyer_(db).UnreadCount(CancellationToken.None)).Count);

        var list = Value(await Farmer_(db).List(1, 20, CancellationToken.None)).Items;
        Assert.Equal(new[] { advice, deal }, list.Select(c => c.ConversationId)); // most recent first
        Assert.Equal("Please send a closer photo of the leaves.", list[0].LastMessagePreview);
        Assert.Equal(1, list[0].UnreadCount);
        Assert.Equal("Kamala Stores", list[1].CounterpartName);
        Assert.Equal(2, list[1].UnreadCount);

        await Farmer_(db).MarkRead(deal, CancellationToken.None);
        Assert.Equal(1, Value(await Farmer_(db).UnreadCount(CancellationToken.None)).Count);
        Assert.Empty(Value(await As(db, OtherFarmer, "Farmer").List(1, 20, CancellationToken.None)).Items);
    }

    [Fact]
    public async Task AChatWithNoMessagesYet_IsNotListed()
    {
        using var db = SeedDb();
        await DealChatAsync(db);

        Assert.Empty(Value(await Farmer_(db).List(1, 20, CancellationToken.None)).Items);
    }

    [Fact]
    public async Task TheOtherSidesReadPosition_IsReported_ForSeenMarks()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);
        var sent = Value(await SendAsync(Farmer_(db), conversationId, "Hello"));
        Assert.Null(Value(await Farmer_(db).Get(conversationId, CancellationToken.None)).CounterpartLastReadMessageId);

        await Buyer_(db).MarkRead(conversationId, CancellationToken.None);

        Assert.Equal(sent.MessageId, Value(await Farmer_(db).Get(conversationId, CancellationToken.None)).CounterpartLastReadMessageId);
    }

    [Fact]
    public async Task Messages_ArePagedNewestFirst_AndReturnedOldestFirst()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);
        for (var n = 1; n <= ConversationsController.MessagePageSize + 10; n++)
        {
            db.ConversationMessages.Add(new ConversationMessage { ConversationId = conversationId, SenderUserId = n % 2 == 0 ? Farmer : Buyer, Body = $"m{n}" });
        }

        await db.SaveChangesAsync();

        var latest = Value(await Farmer_(db).Messages(conversationId, null, CancellationToken.None));
        var older = Value(await Farmer_(db).Messages(conversationId, latest.Items[0].MessageId, CancellationToken.None));

        Assert.True(latest.HasOlder);
        Assert.Equal(ConversationsController.MessagePageSize, latest.Items.Count);
        Assert.Equal("m11", latest.Items[0].Body);
        Assert.Equal("m60", latest.Items[^1].Body);
        Assert.False(older.HasOlder);
        Assert.Equal(Enumerable.Range(1, 10).Select(n => $"m{n}"), older.Items.Select(m => m.Body));
    }

    [Fact]
    public async Task Send_IsRateLimited_AndTrimsTheMessage()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);

        var first = Value(await SendAsync(Farmer_(db), conversationId, "  Hello there  "));
        for (var n = 2; n <= ConversationsController.MessagesPerMinute; n++)
        {
            await SendAsync(Farmer_(db), conversationId, $"message {n}");
        }

        var tooMany = await SendAsync(Farmer_(db), conversationId, "one more");

        Assert.Equal("Hello there", first.Body);
        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<ObjectResult>(tooMany.Result).StatusCode);
        Assert.Equal(ConversationsController.MessagesPerMinute, db.ConversationMessages.Count());
        Assert.IsType<BadRequestObjectResult>((await SendAsync(Buyer_(db), conversationId, "   ")).Result);
    }

    // ----- Reporting -----

    [Fact]
    public async Task OnlyAReportedChat_CanBeReadByAnAdmin_WhoCannotPostInIt()
    {
        using var db = SeedDb();
        var conversationId = await DealChatAsync(db);
        await SendAsync(Farmer_(db), conversationId, "Pay me outside the app or I'll cancel.");
        var admin = As(db, Admin, "Admin");
        Assert.IsType<ForbidResult>((await admin.Get(conversationId, CancellationToken.None)).Result);

        var report = await Buyer_(db).Report(conversationId, new ReportConversationRequest { Reason = "Asking for payment outside the app" }, CancellationToken.None);
        var duplicate = await Buyer_(db).Report(conversationId, new ReportConversationRequest { Reason = "Again" }, CancellationToken.None);

        Assert.IsType<NoContentResult>(report);
        Assert.IsType<ConflictObjectResult>(duplicate);
        Assert.Contains(db.Notifications, n => n.UserId == Admin && n.Title == "A conversation was reported");
        Assert.Contains(db.AuditLogs, a => a.Action == "ConversationReported" && a.EntityId == conversationId && a.UserId == Buyer);
        Assert.True(Value(await Buyer_(db).Get(conversationId, CancellationToken.None)).ReportedByMe);

        var asAdmin = Value(await admin.Get(conversationId, CancellationToken.None));
        Assert.False(asAdmin.CanSend);
        Assert.Equal(new[] { "Nimal Perera", "Kamala Stores" }, asAdmin.Participants!.Select(p => p.Name));
        Assert.Single(Value(await admin.Messages(conversationId, null, CancellationToken.None)).Items);
        Assert.IsType<ForbidResult>((await SendAsync(admin, conversationId, "Admin here")).Result);
        Assert.IsType<NoContentResult>(await admin.MarkRead(conversationId, CancellationToken.None));
        Assert.Empty(db.ConversationReads.Where(r => r.UserId == Admin));
    }

    [Fact]
    public async Task AnAdminResolvesAReport_Once()
    {
        using var db = SeedDb();
        var conversationId = await AdviceChatAsync(db);
        await SendAsync(Farmer_(db), conversationId, "hello");
        await Farmer_(db).Report(conversationId, new ReportConversationRequest { Reason = "Rude reply" }, CancellationToken.None);
        var reports = new ConversationReportsController(db, new CurrentUserService(db), new AuditLogService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(Admin, "Admin") },
            },
        };
        var reportId = db.ConversationReports.Single().ReportId;

        Assert.Equal(1, Value(await reports.OpenCount(CancellationToken.None)).Open);
        var listed = Assert.Single(Value(await reports.List(openOnly: true, 1, 20, CancellationToken.None)).Items);
        Assert.Equal("Leaves curling", listed.Title);
        Assert.Equal("Nimal Perera", listed.ReporterName);

        var resolved = Value(await reports.Resolve(reportId, new ResolveConversationReportRequest { Note = "Spoke to the officer" }, CancellationToken.None));
        Assert.Equal("Admin", resolved.ResolvedByName);
        Assert.IsType<BadRequestObjectResult>((await reports.Resolve(reportId, null, CancellationToken.None)).Result);
        Assert.Equal(0, Value(await reports.OpenCount(CancellationToken.None)).Open);
        Assert.Empty(Value(await reports.List(openOnly: true, 1, 20, CancellationToken.None)).Items);
        Assert.Contains(db.AuditLogs, a => a.Action == "ConversationReportResolved" && a.UserId == Admin);
    }
}
