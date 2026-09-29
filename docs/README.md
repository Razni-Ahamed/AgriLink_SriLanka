# AgriLink Sri Lanka documentation

The technical documentation for the web app, the API and the Agentic AI subsystem. The Flutter app's
own guide is in the [AgriLink_Mobile](https://github.com/Razni-Ahamed/AgriLink_Mobile) repository
(`docs/ARCHITECTURE.md`).

| Document | What it covers |
|---|---|
| [Requirements](requirements.md) | Business problem, objectives, scope, components and owners, user roles, functional and non-functional requirements |
| [Architecture](architecture/README.md) | System architecture, backend layers, the agents and their contracts, the Planner's language model, the cross-platform workflow, React and Flutter design |
| [Database](database/README.md) | EF Core migrations, ER diagrams, keys, constraints and indexes, normalisation, transactions, audit fields, agent workflow state, data dictionary |
| [REST API](api.md) | Conventions, status codes, paging, and all 80 endpoints with the roles allowed to call them |
| [Technical report](technical-report.md) | How each component implements its business rules; third-party services; the photo-diagnosis pipeline; error handling; challenges; limitations |
| [Testing](testing.md) | Strategy, results, backend, database, React and Flutter tests, end-to-end and manual test cases, CI, and the full test inventory |
| [Agentic AI evaluation](agentic-ai-evaluation.md) | The minimum acceptance workflow, golden cases, the live language-model evaluation, safety analysis, photo-model evaluation |
| [Performance](performance.md) | Load tests, race conditions, agent latency, live latency, performance-oriented design |
| [Deployment](deployment/README.md) | Azure and Neon deployment, configuration, startup order, evidence; plus [azure.md](deployment/azure.md) and [llm-planner.md](deployment/llm-planner.md) |
| [Security](security.md) | Authentication, authorisation, data protection, Agentic AI threats and controls, residual risks |
| [Architecture Decision Records](ADRs/README.md) | Nine decisions, including React and Flutter state management, the agent framework, agent state storage and the cloud platform |
| [AI usage declaration](AI_Logs/README.md) | How AI tools were used during development and how their output was checked |
| [References](references.md) | Frameworks, datasets and papers used |

Test accounts for evaluators are given in the submitted report, not here, because this repository is public.
