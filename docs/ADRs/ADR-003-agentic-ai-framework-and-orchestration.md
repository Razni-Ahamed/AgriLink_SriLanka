# ADR-003: Agentic AI framework and orchestration

**Status:** Accepted (2026-08-30), PR #21. It was extended with the photo agents on 2026-09-17 (PRs #43–#49).

**Context.** The workflow must plan, delegate to distinct agents, call allow-listed tools, persist state, validate deterministically and pause for an officer's approval, all under the ASP.NET Core API's authentication and business rules. The domain decisions are mostly deterministic: knowledge-base matching, weather rules and risk rules. Language-model reasoning is optional. The system must run on a free App Service plan with no GPU, and needs no paid API.

**ADR-003 options**

| Option | For | Against |
|---|---|---|
| LangGraph in a Python service (as in the labs) | Graph orchestration, checkpoints, a large ecosystem | A second service to host, secure and deploy; a second auth boundary; the state would live outside the main database; the free tier cannot host both |
| Microsoft Agent Framework / Semantic Kernel | .NET native; plugins; model connectors | Designed around LLM function calling, which our mostly deterministic agents do not need; extra abstraction |
| **Custom C# orchestration in the API** | Same process, DI, transactions, database and auth as the business logic; typed contracts; full control over state, timeouts and failure handling; easy to unit-test | We maintain the orchestration code ourselves; no graph visualiser |

**Decision.**

- **Orchestration.** Implement `AgentOrchestrator` and the agents as C# services behind interfaces (`IPlannerAgent`, `ICropAnalysisAgent`, `IWeatherAgent`, `IValidationAgent`, `IImageClassifier`). Each step is recorded through one `ExecuteStepAsync` wrapper that serialises input and output and catches failures.
- **Photo models.** Serve them **in process with ONNX Runtime** (ADR-008).
- **Model output.** Use language-model output only where it adds value, and only behind validation (ADR-004).

**Consequences.**

- (+) One deployable. Clients never reach the agents except through the API, as specification §2 requires.
- (+) Agent state is in the same PostgreSQL database and saved in the same transaction as the advisory.
- (+) The golden cases run the real orchestrator in milliseconds, in CI.
- (−) Adding parallel branches or long-running workflows would need more orchestration code, or a move to a framework.
- (−) The Python and C# image preprocessing must stay identical, which the parity tests enforce.
