using System.Net;
using AgriLink.API.Controllers;
using AgriLink.API.Data;
using AgriLink.API.DTOs.Users;
using AgriLink.API.Models;
using AgriLink.API.Services;
using AgriLink.API.Services.Sms;
using AgriLink.API.Tests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Tests.Services;

public class SmsAlertsTests
{
    private static readonly SmsOptions Configured = new()
    {
        Provider = "NotifyLk",
        NotifyLk = new NotifyLkOptions { UserId = "123", ApiKey = "secret-key", SenderId = "AgriLink" },
    };

    // ---------- Phone numbers ----------

    [Theory]
    [InlineData("0771234567", "94771234567")]
    [InlineData("077 123 4567", "94771234567")]
    [InlineData("+94771234567", "94771234567")]
    [InlineData("94771234567", "94771234567")]
    [InlineData("0112345678", null)] // Colombo landline
    [InlineData("0812345678", null)] // Kandy landline
    [InlineData("077123", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void ToInternationalMobile_AcceptsOnlySriLankanMobiles(string? phone, string? expected) =>
        Assert.Equal(expected, SmsText.ToInternationalMobile(phone));

    // ---------- Texts ----------

    [Theory]
    [InlineData(SmsAlertKind.NewPurchaseRequest)]
    [InlineData(SmsAlertKind.OrderConfirmed)]
    [InlineData(SmsAlertKind.OfficerReplied)]
    public void EveryAlertHasATextInEachLanguage(SmsAlertKind kind)
    {
        var alert = new SmsAlert(kind, "Tomato", "20 kg");
        var english = SmsTemplates.Render(alert, "en");
        var sinhala = SmsTemplates.Render(alert, "si");
        var tamil = SmsTemplates.Render(alert, "ta");

        foreach (var text in new[] { english, sinhala, tamil })
        {
            Assert.StartsWith("AgriLink:", text);
            Assert.Contains("Tomato", text);
        }

        Assert.True(SmsText.IsGsm7(english));
        Assert.Contains(sinhala, c => c is >= '඀' and <= '෿');
        Assert.Contains(tamil, c => c is >= '஀' and <= '௿');
    }

    [Fact]
    public void UnknownLanguage_FallsBackToEnglish() =>
        Assert.Equal(
            SmsTemplates.Render(new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"), "en"),
            SmsTemplates.Render(new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"), "fr"));

    [Fact]
    public void LongIssueTitles_AreClipped()
    {
        var text = SmsTemplates.Render(new SmsAlert(SmsAlertKind.OfficerReplied, new string('x', 200)), "en");
        Assert.True(text.Length < 160, $"Text was {text.Length} characters");
    }

    // ---------- Queue ----------

    [Fact]
    public void Queue_DoesNothingWhenSmsIsNotConfigured()
    {
        var queue = new SmsAlertQueue(Options.Create(new SmsOptions()), NullLogger<SmsAlertQueue>.Instance);
        queue.Enqueue(1, new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"));

        Assert.False(queue.IsEnabled);
        Assert.False(queue.Reader.TryRead(out _));
    }

    [Fact]
    public void Queue_DropsAlertsWhenFull_InsteadOfBlocking()
    {
        var options = new SmsOptions { Provider = "NotifyLk", NotifyLk = Configured.NotifyLk, QueueCapacity = 1 };
        var queue = new SmsAlertQueue(Options.Create(options), NullLogger<SmsAlertQueue>.Instance);

        queue.Enqueue(1, new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"));
        queue.Enqueue(2, new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"));

        Assert.True(queue.Reader.TryRead(out var first));
        Assert.Equal(1, first!.UserId);
        Assert.False(queue.Reader.TryRead(out _));
    }

    [Fact]
    public void NotificationService_WithoutAQueue_IgnoresSms()
    {
        using var db = CreateDb();
        new NotificationService(db).QueueSms(1, new SmsAlert(SmsAlertKind.OrderConfirmed, "Rice", "5 kg"));
    }

    // ---------- Dispatcher ----------

    [Fact]
    public async Task Dispatcher_TextsAnOptedInFarmer_InTheirLanguage_AtTheirProfilePhone()
    {
        var (provider, sender) = CreateServices();
        await SeedFarmerAsync(provider, enabled: true, language: "si", phone: "0771234567");

        await CreateDispatcher(provider).SendOneAsync(
            new QueuedSmsAlert(10, new SmsAlert(SmsAlertKind.NewPurchaseRequest, "Tomato", "20 kg")), CancellationToken.None);

        var (number, text) = Assert.Single(sender.Sent);
        Assert.Equal("94771234567", number);
        Assert.Equal(SmsTemplates.Render(new SmsAlert(SmsAlertKind.NewPurchaseRequest, "Tomato", "20 kg"), "si"), text);
    }

    [Theory]
    [InlineData(false, "0771234567")] // opted out
    [InlineData(true, "0812345678")] // landline
    [InlineData(true, null)] // no number
    public async Task Dispatcher_SkipsUsersWhoCantOrDontWantSms(bool enabled, string? phone)
    {
        var (provider, sender) = CreateServices();
        await SeedFarmerAsync(provider, enabled, "en", phone);

        await CreateDispatcher(provider).SendOneAsync(
            new QueuedSmsAlert(10, new SmsAlert(SmsAlertKind.OfficerReplied, "Leaf spots")), CancellationToken.None);

        Assert.Empty(sender.Sent);
    }

    [Fact]
    public async Task Dispatcher_SkipsDeactivatedAccounts()
    {
        var (provider, sender) = CreateServices();
        await SeedFarmerAsync(provider, enabled: true, language: "en", phone: "0771234567", isActive: false);

        await CreateDispatcher(provider).SendOneAsync(
            new QueuedSmsAlert(10, new SmsAlert(SmsAlertKind.OfficerReplied, "Leaf spots")), CancellationToken.None);

        Assert.Empty(sender.Sent);
    }

    [Fact]
    public async Task Dispatcher_SurvivesAGatewayFailure()
    {
        var (provider, sender) = CreateServices();
        sender.Throw = true;
        await SeedFarmerAsync(provider, enabled: true, language: "en", phone: "0771234567");

        // Must not throw: a failed text never takes the dispatcher down.
        await CreateDispatcher(provider).SendOneAsync(
            new QueuedSmsAlert(10, new SmsAlert(SmsAlertKind.OfficerReplied, "Leaf spots")), CancellationToken.None);
    }

    // ---------- Notify.lk ----------

    [Fact]
    public async Task NotifyLk_SendsTheDocumentedQueryParameters()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "{\"status\":\"success\",\"data\":\"Sent\"}");
        var sender = new NotifyLkSmsSender(new HttpClient(handler), Options.Create(Configured), NullLogger<NotifyLkSmsSender>.Instance);

        var sent = await sender.SendAsync("94771234567", "AgriLink: hello & bye", CancellationToken.None);

        Assert.True(sent);
        var query = System.Web.HttpUtility.ParseQueryString(handler.LastRequest!.RequestUri!.Query);
        Assert.Equal("123", query["user_id"]);
        Assert.Equal("secret-key", query["api_key"]);
        Assert.Equal("AgriLink", query["sender_id"]);
        Assert.Equal("94771234567", query["to"]);
        Assert.Equal("AgriLink: hello & bye", query["message"]);
        Assert.Null(query["type"]);
    }

    [Fact]
    public async Task NotifyLk_SendsSinhalaAndTamilAsUnicode()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "{\"status\":\"success\"}");
        var sender = new NotifyLkSmsSender(new HttpClient(handler), Options.Create(Configured), NullLogger<NotifyLkSmsSender>.Instance);

        await sender.SendAsync("94771234567", "AgriLink: ඇණවුම", CancellationToken.None);

        var query = System.Web.HttpUtility.ParseQueryString(handler.LastRequest!.RequestUri!.Query);
        Assert.Equal("unicode", query["type"]);
        Assert.Equal("AgriLink: ඇණවුම", query["message"]);
    }

    [Theory]
    [InlineData(HttpStatusCode.OK, "{\"status\":\"error\",\"errors\":\"Invalid API key\"}")]
    [InlineData(HttpStatusCode.Unauthorized, "{\"status\":\"error\"}")]
    [InlineData(HttpStatusCode.OK, "not json")]
    public async Task NotifyLk_ReportsRefusals(HttpStatusCode status, string body)
    {
        var sender = new NotifyLkSmsSender(
            new HttpClient(new StubHandler(status, body)), Options.Create(Configured), NullLogger<NotifyLkSmsSender>.Instance);

        Assert.False(await sender.SendAsync("94771234567", "AgriLink: hi", CancellationToken.None));
    }

    // ---------- Settings endpoint ----------

    [Fact]
    public async Task Settings_StartOffInEnglish_AndShowWhetherSmsIsAvailable()
    {
        using var db = CreateDb();
        SeedFarmer(db, enabled: false, language: "en", phone: "0771234567");

        var result = await CreateController(db, Configured).Get();

        var settings = Assert.IsType<SmsAlertSettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.True(settings.Available);
        Assert.False(settings.Enabled);
        Assert.Equal("en", settings.Language);
        Assert.Equal("0771234567", settings.PhoneNumber);
        Assert.True(settings.PhoneCanReceiveSms);
    }

    [Fact]
    public async Task Settings_CanBeTurnedOnInTamil()
    {
        using var db = CreateDb();
        SeedFarmer(db, enabled: false, language: "en", phone: "0771234567");

        var result = await CreateController(db, new SmsOptions()).Update(new UpdateSmsAlertSettingsRequest { Enabled = true, Language = "ta" });

        var settings = Assert.IsType<SmsAlertSettingsResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.False(settings.Available);
        Assert.True(settings.Enabled);
        Assert.Equal("ta", settings.Language);
        var user = await db.Users.SingleAsync(u => u.Id == 10);
        Assert.True(user.SmsAlertsEnabled);
        Assert.Equal("ta", user.SmsLanguage);
    }

    [Fact]
    public async Task Settings_RejectAnUnknownLanguage()
    {
        using var db = CreateDb();
        SeedFarmer(db, enabled: false, language: "en", phone: "0771234567");

        var result = await CreateController(db, Configured).Update(new UpdateSmsAlertSettingsRequest { Language = "fr" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Settings_CantBeTurnedOnWithoutAMobileNumber()
    {
        using var db = CreateDb();
        SeedFarmer(db, enabled: false, language: "en", phone: "0812345678");

        var result = await CreateController(db, Configured).Update(new UpdateSmsAlertSettingsRequest { Enabled = true });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False((await db.Users.SingleAsync(u => u.Id == 10)).SmsAlertsEnabled);
    }

    [Fact]
    public async Task Settings_CanAlwaysBeTurnedOff()
    {
        using var db = CreateDb();
        SeedFarmer(db, enabled: true, language: "si", phone: null);

        var result = await CreateController(db, Configured).Update(new UpdateSmsAlertSettingsRequest { Enabled = false });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.False((await db.Users.SingleAsync(u => u.Id == 10)).SmsAlertsEnabled);
    }

    // ---------- Helpers ----------

    private static AgriLinkDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<AgriLinkDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static void SeedFarmer(AgriLinkDbContext db, bool enabled, string language, string? phone, bool isActive = true)
    {
        db.Users.Add(new ApplicationUser
        {
            Id = 10,
            UserName = "farmer10",
            Email = "farmer10@agrilink.lk",
            FullName = "Farmer One",
            IsActive = isActive,
            SmsAlertsEnabled = enabled,
            SmsLanguage = language,
        });
        db.FarmerProfiles.Add(new FarmerProfile { FarmerProfileId = 1, UserId = 10, NIC = "1", District = "Kandy", PhoneNumber = phone });
        db.SaveChanges();
    }

    private static async Task SeedFarmerAsync(IServiceProvider provider, bool enabled, string language, string? phone, bool isActive = true)
    {
        using var scope = provider.CreateScope();
        SeedFarmer(scope.ServiceProvider.GetRequiredService<AgriLinkDbContext>(), enabled, language, phone, isActive);
        await Task.CompletedTask;
    }

    private static (ServiceProvider Provider, RecordingSender Sender) CreateServices()
    {
        var sender = new RecordingSender();
        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<AgriLinkDbContext>(o => o.UseInMemoryDatabase(dbName));
        services.AddSingleton<ISmsSender>(sender);
        return (services.BuildServiceProvider(), sender);
    }

    private static SmsAlertDispatcher CreateDispatcher(ServiceProvider provider) => new(
        new SmsAlertQueue(Options.Create(Configured), NullLogger<SmsAlertQueue>.Instance),
        provider.GetRequiredService<IServiceScopeFactory>(),
        NullLogger<SmsAlertDispatcher>.Instance);

    private static SmsAlertsController CreateController(AgriLinkDbContext db, SmsOptions options) => new(
        db, new CurrentUserService(db), Options.Create(options))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = ClaimsPrincipalTestHelpers.BuildPrincipal(10, "Farmer") },
        },
    };

    private sealed class RecordingSender : ISmsSender
    {
        public List<(string Number, string Text)> Sent { get; } = new();
        public bool Throw { get; set; }
        public bool IsConfigured => true;

        public Task<bool> SendAsync(string internationalNumber, string text, CancellationToken cancellationToken)
        {
            if (Throw)
            {
                throw new HttpRequestException("gateway down");
            }

            Sent.Add((internationalNumber, text));
            return Task.FromResult(true);
        }
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public StubHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(new HttpResponseMessage(_status) { Content = new StringContent(_body) });
        }
    }
}
