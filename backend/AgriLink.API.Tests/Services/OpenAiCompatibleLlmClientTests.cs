using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using AgriLink.API.Services.Agents;
using AgriLink.API.Services.Agents.Llm;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Tests.Services;

public class OpenAiCompatibleLlmClientTests
{
    private static OpenAiCompatibleLlmClient Client(StubHandler handler, string? apiKey = "secret-key") =>
        new(new HttpClient(handler), Options.Create(new LlmOptions
        {
            Enabled = true,
            BaseUrl = "https://agrilink-qwen.example/v1/",
            Model = "qwen3.8-27b",
            ApiKey = apiKey,
        }));

    private static HttpResponseMessage Reply(HttpStatusCode status, string body) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    [Fact]
    public async Task SendsAStrictSchemaRequest_WithTheKey_AndReturnsTheAnswer()
    {
        var handler = new StubHandler(_ => Reply(HttpStatusCode.OK, """{"choices":[{"message":{"role":"assistant","content":"{\"steps\":[],\"reasoning\":\"ok\"}"}}]}"""));

        var answer = await Client(handler).CompleteJsonAsync("system", "user", PlannerPrompt.OutputSchema(), CancellationToken.None);

        Assert.Equal("""{"steps":[],"reasoning":"ok"}""", answer);
        var request = handler.Requests.Single();
        Assert.Equal("https://agrilink-qwen.example/v1/chat/completions", request.Uri.ToString());
        Assert.Equal("Bearer secret-key", request.Authorization);
        Assert.True(request.SkipsNgrokWarning);
        var body = JsonNode.Parse(request.Body)!;
        Assert.Equal("qwen3.8-27b", body["model"]!.GetValue<string>());
        Assert.Equal("none", body["reasoning_effort"]!.GetValue<string>());
        Assert.Equal("json_schema", body["response_format"]!["type"]!.GetValue<string>());
        Assert.True(body["response_format"]!["json_schema"]!["strict"]!.GetValue<bool>());
        Assert.Equal("system", body["messages"]![0]!["content"]!.GetValue<string>());
        Assert.Equal("user", body["messages"]![1]!["content"]!.GetValue<string>());
    }

    [Fact]
    public async Task WithoutAKey_SendsNoAuthorizationHeader()
    {
        var handler = new StubHandler(_ => Reply(HttpStatusCode.OK, """{"choices":[{"message":{"content":"{}"}}]}"""));

        await Client(handler, apiKey: null).CompleteJsonAsync("s", "u", PlannerPrompt.OutputSchema(), CancellationToken.None);

        Assert.Null(handler.Requests.Single().Authorization);
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, false)] // wrong key: asking again won't help
    [InlineData(HttpStatusCode.NotFound, false)] // tunnel offline
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.BadGateway, true)]
    public async Task AnErrorStatus_SaysWhetherARetryCouldHelp(HttpStatusCode status, bool retryable)
    {
        var handler = new StubHandler(_ => Reply(status, "{}"));

        var error = await Assert.ThrowsAsync<LlmUnavailableException>(
            () => Client(handler).CompleteJsonAsync("s", "u", PlannerPrompt.OutputSchema(), CancellationToken.None));

        Assert.Equal(retryable, error.Retryable);
        Assert.Contains(((int)status).ToString(), error.Message);
    }

    [Theory]
    [InlineData("""{"choices":[{"message":{"content":""}}]}""")]
    [InlineData("""{"choices":[]}""")]
    [InlineData("<html>not json</html>")]
    public async Task AnEmptyOrUnreadableReply_IsARetryableFailure(string body)
    {
        var handler = new StubHandler(_ => Reply(HttpStatusCode.OK, body));

        var error = await Assert.ThrowsAsync<LlmUnavailableException>(
            () => Client(handler).CompleteJsonAsync("s", "u", PlannerPrompt.OutputSchema(), CancellationToken.None));

        Assert.True(error.Retryable);
    }

    [Fact]
    public async Task ARefusedConnection_IsNotRetried()
    {
        var handler = new StubHandler(_ => throw new HttpRequestException(
            "No connection could be made", new System.Net.Sockets.SocketException((int)System.Net.Sockets.SocketError.ConnectionRefused)));

        var error = await Assert.ThrowsAsync<LlmUnavailableException>(
            () => Client(handler).CompleteJsonAsync("s", "u", PlannerPrompt.OutputSchema(), CancellationToken.None));

        Assert.False(error.Retryable);
    }

    [Fact]
    public async Task AnUnreachableServer_IsARetryableFailure()
    {
        var handler = new StubHandler(_ => throw new HttpRequestException("No such host is known."));

        var error = await Assert.ThrowsAsync<LlmUnavailableException>(
            () => Client(handler).CompleteJsonAsync("s", "u", PlannerPrompt.OutputSchema(), CancellationToken.None));

        Assert.True(error.Retryable);
    }

    private sealed record SentRequest(Uri Uri, string? Authorization, bool SkipsNgrokWarning, string Body);

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) => _respond = respond;

        public List<SentRequest> Requests { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(new SentRequest(
                request.RequestUri!,
                request.Headers.Authorization?.ToString(),
                request.Headers.Contains("ngrok-skip-browser-warning"),
                request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken)));
            return _respond(request);
        }
    }
}
