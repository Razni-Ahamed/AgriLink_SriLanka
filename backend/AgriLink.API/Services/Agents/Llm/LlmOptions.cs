namespace AgriLink.API.Services.Agents.Llm;

/// <summary>
/// The language model the Planner agent may use. Off by default: without it the rule-based planner
/// runs exactly as before. Any OpenAI-compatible chat server works (LM Studio, llama.cpp, Ollama);
/// the team runs Qwen on a laptop with LM Studio, reached from Azure through an ngrok tunnel.
/// </summary>
public class LlmOptions
{
    public const string SectionName = "Llm";

    public bool Enabled { get; set; }

    /// <summary>The server's OpenAI-compatible root, e.g. http://localhost:1234/v1.</summary>
    public string BaseUrl { get; set; } = "http://localhost:1234/v1";

    /// <summary>The model identifier the server knows the model by.</summary>
    public string Model { get; set; } = "qwen3.8-27b";

    /// <summary>Sent as a bearer token; the tunnel refuses requests without it. A secret, so it
    /// only ever comes from user-secrets or an App Service setting (Llm__ApiKey).</summary>
    public string? ApiKey { get; set; }

    /// <summary>How long one attempt may take before the planner gives up on it.</summary>
    public int TimeoutSeconds { get; set; } = 20;

    /// <summary>Attempts before falling back to the rules: 2 means one retry.</summary>
    public int MaxAttempts { get; set; } = 2;

    /// <summary>Asks a reasoning model (such as Qwen 3) to answer directly. Its hidden thinking
    /// would take many times longer and is not something the app should keep anyway.</summary>
    public bool DisableThinking { get; set; } = true;
}
