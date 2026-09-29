# The Planner agent's language model (Qwen on a laptop)

The Planner agent decides which analyses a crop issue needs. It can use a language model for that
decision. We run **Qwen 3.8 27B (Q4_K_M)** in **LM Studio** on a laptop with an RTX 5090 (24 GB), and
reach it from the Azure API through an **ngrok** tunnel:

```
Phone / website ──► Azure API ──► ngrok tunnel (key required) ──► laptop: LM Studio + Qwen
                        ▲                                                │
                        └───────────── JSON plan ◄───────────────────────┘
```

- **Only the API calls the model.** The apps never do, as the specification requires. Only planning
  details are sent: crop, district, severity, the report text and any photo diagnosis. No names, phone
  numbers or accounts are sent.
- **The model's plan is checked before use.**
  - It must be JSON naming only allow-listed agents (`CropAnalysisAgent`, `WeatherAgent`), with a
    reason for each (`Services/Agents/PlannerPrompt.cs`).
  - Business rules then correct it where needed, and each correction is recorded in the trace.
    Without a photo diagnosis, crop analysis always runs. High-severity reports and weather-driven
    photo diagnoses always get weather.
  - Validation still runs afterwards, and an officer still approves every advisory.
- **It is never required.** When the laptop is off, the tunnel is closed, the model is slow (20 s per
  attempt, one retry) or its answer is rejected, the keyword rules plan instead. The trace records
  why (`FallbackReason`).
- **No hidden reasoning is generated or stored.** Thinking is switched off (`reasoning_effort: none`).
  The trace keeps only the plan and the model's short stated reason.

## Requirements

- LM Studio 0.4 or later, with `qwen/qwen3.8-27b` downloaded (about 17 GB). It needs roughly 17 GB of
  GPU memory; a smaller model works too if you change `-Model`/`-Identifier`.
- ngrok: a free account, the agent installed (`winget install ngrok.ngrok`), and one free static domain
  claimed in the ngrok dashboard. Add your authtoken once, yourself:
  `ngrok config add-authtoken <token>`.
- The Azure CLI (`az login`), only for connecting the Azure API.

## Startup order (every demo)

1. `.\deploy\start-llm-planner.ps1 -Domain <your-domain>.ngrok-free.app`
   - Starts LM Studio's server on `localhost:1234` and loads the model onto the GPU (about 10 s).
   - Opens the tunnel. Leave the window open.
   - The first run creates the shared key in `%USERPROFILE%\.agrilink\llm-key.txt`. It stays out of
     the repository.
2. First time only: `.\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Domain <your-domain>.ngrok-free.app`
   - Stores `Llm__Enabled`, `Llm__BaseUrl`, `Llm__Model` and `Llm__ApiKey` in the App Service
     settings. The API restarts once.
3. Report an issue from the app. On the advisory page, the officer's trace shows
   **Planner — Planned By: LLM (qwen3.8-27b)**, the steps with their reasons, and any guardrail notes.

To stop, press Ctrl+C in the tunnel window. The API then plans with the rules, and nothing else
changes. To switch the model off in Azure entirely:
`.\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Disable`.

## Running the API locally with the model

No tunnel is needed. With LM Studio's server running:

```powershell
cd backend/AgriLink.API
dotnet user-secrets set "Llm:Enabled" "true"     # Llm:BaseUrl defaults to http://localhost:1234/v1
dotnet run --launch-profile http
```

## Evaluating the model

`LlmPlannerLiveEvaluationTests` runs the golden reports through the real model inside the whole
pipeline. The reports include a prompt-injection attempt and photo cases. The test checks each plan
with rules and prints a results table:

```powershell
cd backend
$env:AGRILINK_TEST_LLM_URL = "http://localhost:1234/v1"
dotnet test --filter LlmPlannerLiveEvaluation --logger "console;verbosity=detailed"
```

The tunnel's rules (written by the start script) accept only `POST /v1/chat/completions` with the key,
at most 30 requests a minute per client.
