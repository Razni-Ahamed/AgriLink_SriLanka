using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;

namespace AgriLink.API.Services.Agents.Llm;

public interface ILlmClient
{
    /// <summary>
    /// Asks the model for one JSON answer that follows <paramref name="schema"/> and returns the
    /// answer's text, still unvalidated. Throws <see cref="LlmUnavailableException"/> when there is
    /// no usable answer.
    /// </summary>
    Task<string> CompleteJsonAsync(string systemPrompt, string userPrompt, JsonObject schema, CancellationToken cancellationToken);
}

/// <summary>No usable answer from the language model. <see cref="Retryable"/> says whether asking
/// again could help (a timeout or a 5xx) or not (the tunnel is offline, or the key is wrong).</summary>
public class LlmUnavailableException : Exception
{
    public LlmUnavailableException(string message, bool retryable, Exception? inner = null) : base(message, inner)
    {
        Retryable = retryable;
    }

    public bool Retryable { get; }
}

/// <summary>Calls an OpenAI-compatible /chat/completions endpoint (LM Studio, llama.cpp, Ollama).</summary>
public class OpenAiCompatibleLlmClient : ILlmClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<LlmOptions> _options;

    public OpenAiCompatibleLlmClient(HttpClient httpClient, IOptions<LlmOptions> options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<string> CompleteJsonAsync(string systemPrompt, string userPrompt, JsonObject schema, CancellationToken cancellationToken)
    {
        var options = _options.Value;
        var body = new JsonObject
        {
            ["model"] = options.Model,
            // Nearly deterministic: the same report should get the same plan.
            ["temperature"] = 0.1,
            ["max_tokens"] = 400,
            ["messages"] = new JsonArray(
                new JsonObject { ["role"] = "system", ["content"] = systemPrompt },
                new JsonObject { ["role"] = "user", ["content"] = userPrompt }),
            // Constrained decoding: the server can only produce JSON of this shape.
            ["response_format"] = new JsonObject
            {
                ["type"] = "json_schema",
                ["json_schema"] = new JsonObject { ["name"] = "answer", ["strict"] = true, ["schema"] = schema.DeepClone() },
            },
        };
        if (options.DisableThinking)
        {
            body["reasoning_effort"] = "none";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl.TrimEnd('/')}/chat/completions")
        {
            Content = JsonContent.Create(body),
        };
        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);
        }

        // ngrok's free domains show browsers a warning page first; an API call should never get it.
        request.Headers.Add("ngrok-skip-browser-warning", "true");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            // Nothing listening (LM Studio's server is off): asking again a moment later won't help.
            var refused = ex.InnerException is System.Net.Sockets.SocketException { SocketErrorCode: System.Net.Sockets.SocketError.ConnectionRefused };
            throw new LlmUnavailableException("The language model server could not be reached.", retryable: !refused, ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                // 401: the key is wrong; 404: the tunnel is offline. Asking again won't help either.
                throw new LlmUnavailableException(
                    $"The language model server answered HTTP {status}.", retryable: status >= 500 || status == 429);
            }

            JsonNode? payload;
            try
            {
                payload = await JsonNode.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            }
            catch (JsonException ex)
            {
                throw new LlmUnavailableException("The language model server sent an unreadable response.", retryable: true, ex);
            }

            // JsonArray's indexer throws on an empty array rather than returning null.
            if (payload?["choices"] is JsonArray { Count: > 0 } choices
                && choices[0]?["message"]?["content"] is JsonValue value
                && value.TryGetValue<string>(out var content)
                && !string.IsNullOrWhiteSpace(content))
            {
                return content;
            }

            throw new LlmUnavailableException("The language model returned an empty answer.", retryable: true);
        }
    }
}
