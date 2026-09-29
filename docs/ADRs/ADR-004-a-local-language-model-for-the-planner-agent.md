# ADR-004: A local language model for the Planner agent

**Status:** Accepted (2026-09-29), PRs #71 and #72.

**Context.** The rules Planner chooses the weather analysis only when the report mentions keywords such as "rain" or "humid". Farmers describe problems in their own words ("since the monsoon started"). A language model plans better on such wording, but the specification requires validated inputs and outputs, prompt-injection resistance, timeouts and safe failure. Paid hosted APIs were not an option, and farmers' reports should not be sent to a third-party AI provider.

**ADR-004 options**

| Option | For | Against |
|---|---|---|
| Keep rules only | Deterministic and free | Misses weather-related problems described without keywords |
| Hosted LLM API (paid) | Strong models, always available | Cost; farmer text leaves our control; API keys to protect |
| **Local open-weight model (Qwen 3.8 27B, Q4) in LM Studio on the team's RTX 5090 laptop, reached through an ngrok tunnel** | No cost; data stays on team hardware; OpenAI-compatible API; strong structured-output support | Available only while the laptop runs; tunnel security needed; seconds of latency |

**Decision.**

- **Where it runs.** Use the local Qwen model through an **OpenAI-compatible client** inside the API, which is the only caller.
- **How it is constrained.** Strict JSON schema, thinking switched off, the report as escaped untrusted data, and an allow-list of two agents. `PlannerPrompt.Parse` and business-rule guardrails check the answer. A 20 s timeout per attempt and one retry follow, then the **keyword rules** with the reason recorded. The model never approves anything.
- **How the tunnel is protected.** A traffic policy accepts only `POST /v1/chat/completions` with a bearer key, at most 30 requests a minute.

**Consequences.**

- (+) Better plans for natural wording. It was verified live on nine cases, with no invalid answers (§8.5).
- (+) The system still works when the laptop is off, and the trace says which planner ran and why.
- (−) Adds 2–6 s to issue submission when the model is used.
- (−) The tunnel depends on a team member's laptop and ngrok's free tier. For a real deployment, the same client would point at a hosted GPU server by changing `Llm__BaseUrl` only.
