# Architecture

> Part of the AgriLink Sri Lanka project documentation ([index](../README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 3. Full-stack and Agentic AI architecture

## 3.1 System architecture

AgriLink has three layers. Two clients talk only to the ASP.NET Core Web API. The API is the single authority for identity, permissions, validation, business rules, persistence and the Agentic AI workflow (specification §2). No client calls the database, the weather service, the photo store or the language model directly.

![Layered system architecture. Every arrow into the data layer starts at the API.](img/diagram-architecture.png)
*Layered system architecture. Every arrow into the data layer starts at the API.*

Design choices that follow from this layering:

- **One API, one database, one identity.** The React and Flutter apps share accounts, JWTs, role rules and data. A farm created on the phone appears on the website at once, and an officer's decision on the website reaches the phone.
- **The agents run inside the API process.** The orchestrator and its six agents are C# services registered with dependency injection. The disease classifiers are ONNX models run by ONNX Runtime in the same process. There is therefore no internal Python service to secure, host or keep in sync (ADR-003).
- **Everything external sits behind an interface with a timeout and a fallback.** This covers `IWeatherAgent` (Open-Meteo), `IImageStorageService` (Cloudinary or local disk), `IImageClassifier` (ONNX) and `ILlmClient` (the language model). When any of them fails, the pipeline records the failure and continues safely.

## 3.2 Backend architecture

The API follows the layered structure taught in the module:

- **Controllers** (18) define the REST resources, bind and validate DTOs, check roles with `[Authorize(Roles = …)]`, and check ownership: a farmer's own farms, an officer's own district.
- **DTOs** (`DTOs/<Area>/…Request|Response`) are the public contract. Entities are never returned directly, so internal fields such as password hashes, security stamps and storage keys never leave the API.
- **Services** hold the logic shared between controllers: token issue and session validation, the current user, notifications, the audit log, photo processing and storage, account normalisation, and the agents.
- **Data access** goes through EF Core's `AgriLinkDbContext`, a unit of work over typed `DbSet`s. Configuration uses the fluent API: keys, indexes, delete behaviour, row versions, jsonb columns and enum-to-string conversion.

The request pipeline runs in this order: global exception handler (ProblemDetails), Swagger, HTTPS redirection, CORS, authentication (JWT validation, then a per-request account check), authorisation, controllers, and the health checks. All I/O is asynchronous (`async`/`await` with `CancellationToken`).

**Deliberate simplification.** Several controllers (`AdminController`, `UsersController`, `IssuesController`) use the DbContext directly instead of a separate repository or application-service layer. EF Core's DbContext already provides the repository and unit-of-work patterns, and it keeps the queries in the database, including paging, search and sorting. The logic that is shared, or that is complex enough to test on its own, was moved into services: the agents, photo processing, the account rules and the audit log. §6.10 lists this as technical debt.

## 3.3 Agentic AI architecture

A crop issue report is the assessed workflow's **domain objective**. `AgentOrchestrator.RunPipelineAsync` creates an `AgentWorkflow` record with the objective (`"Analyze crop issue: <title>"`), then runs each agent as a recorded step (`AgentExecution`): name, JSON input, JSON output, start and end time, and status. Each agent has one job, a typed input and output contract, and access only to its own tools.

![The agent workflow for one crop issue report. Every step is persisted; the officer's decision is the high-impact action that pauses the workflow.](img/diagram-pipeline.png)
*The agent workflow for one crop issue report. Every step is persisted; the officer's decision is the high-impact action that pauses the workflow.*

**The six distinct agents (specification §9.1, "What counts as a distinct agent?")**

| Agent (owner) | Responsibility | Input contract | Output contract | Tools and permissions |
|---|---|---|---|---|
| **PlannerAgent** (Razni) | Decides which analysis agents the report needs, and why | `AgentContext`: crop, variety, district, severity, title, description, photo findings | `PlannerPlan`: `UseCropAgent`, `UseWeatherAgent`, `Steps[{Agent, Reason}]`, `Reasoning`, `PlannedBy`, `LlmAttempts`, `PromptVersion`, `GuardrailNotes`, `FallbackReason` | Optional language model (one chat-completions call, strict JSON schema, 20 s timeout, one retry); may name only `CropAnalysisAgent` and `WeatherAgent`; no database access |
| **ImageClassificationAgent** (Razni) | Identifies the disease from a photo | Crop type and the processed photo bytes | `ImageFindings`: top-k diseases with calibrated probabilities, model version, auto-release threshold | Read-only ONNX model for that crop (Tomato, Potato, Cassava); timeout; runs only for crops with a model |
| **PhotoTriageAgent** (Razni) | Decides whether a photo diagnosis must go to an officer | `ImageFindings`, the disease's knowledge entry, the farmer's text | `PhotoTriageResult`: `AutoRelease`, `EscalationReasons[]`, confidence | Read-only disease knowledge base; pure and deterministic |
| **CropAnalysisAgent** (Gayathri) | Matches the described symptoms to likely causes and actions | Crop type, title, description, recent crop activities | `CropFindings`: `PossibleCauses[]`, `RecommendedActions[]`, `Confidence`, `Notes` | Read-only crop knowledge base (symptom patterns per crop); detects conflicting causes and fertiliser conflicts |
| **WeatherAgent** (Fernando) | Adds the district's recent weather | District | `WeatherFindings`: summary, 7-day rainfall (mm), average temperature (°C), `IsFallback`, notes | One HTTP GET to Open-Meteo; coordinates come only from an allow-list of the 25 districts; 8 s timeout; no key, no personal data |
| **ValidationAgent** (Jayaweera) | Reconciles the findings, applies business rules, sets risk and confidence, writes the advice | Context plus crop and weather findings (either may be missing) | `ValidationResult`: `RiskLevel`, `Recommendation`, `ConfidenceScore`, `RequiresApproval` (always true), notes | No external tools; deterministic rules only |

The orchestrator owns the state. Agents never write to the database. They return typed results, and the orchestrator serialises each step's input and output (enums as names) into the trace. The **high-impact action** is releasing treatment advice to a farmer. It is never taken by an agent: the advisory is saved as `Draft` with `RequiresApproval = true`, and only an officer or admin can approve or reject it through `POST /api/advisories/{id}/approve|reject`.

## 3.4 The Planner's language model

The Planner can use **Qwen 3.8 27B**, run locally in LM Studio on a team laptop and reached from Azure through an ngrok tunnel (ADR-004). The model's answer is never trusted as it stands: it passes a deterministic parser and then business-rule guardrails. If anything fails, the keyword rules plan instead, and the reason is recorded.

![How the Planner uses the language model, and where its output is checked](img/diagram-llmplanner.png)
*How the Planner uses the language model, and where its output is checked*

- **Prompt design.** The system prompt describes the two agents the Planner may choose and says the report is untrusted data. The farmer's report is serialised to JSON inside `<report>` tags. JSON serialisation escapes quotes and angle brackets, so the text cannot close the tag or pose as instructions. Only planning facts are sent: no names, phone numbers or account data.
- **Structured output.** The request carries a strict `json_schema`: `steps` holds at most two items, `agent` is an enum of the allowed agents, and `why` and `reasoning` are length-limited strings. Temperature is 0.1, and thinking is switched off (`reasoning_effort: none`), so no hidden reasoning is produced or stored.
- **Validation.** `PlannerPrompt.Parse` accepts only a JSON object whose agents are allowed, not repeated, and each has a reason. Anything else is rejected with a named reason.
- **Guardrails.** Without a photo diagnosis, Crop Analysis always runs. With one, Crop Analysis is removed, because the photo already answered it. High-severity reports and weather-driven diseases always get Weather. Every correction is written to `GuardrailNotes`.
- **Failure handling.** Each attempt has its own timeout. A timeout, 429 or 5xx is retried once. A 401, 404 or refused connection is not retried. After a failure the rules plan, with `PlannedBy = "Rules (the language model was not used)"` and a `FallbackReason`.

## 3.5 Cross-platform workflow

The workflow required by specification §10 starts on the phone, goes through the API, PostgreSQL and the agents, needs approval in the other client, and returns an updated status to the user who started it:

![The cross-platform workflow: the farmer reports on Flutter, the officer approves on React, and the farmer's phone shows the result](img/diagram-crossplatform.png)
*The cross-platform workflow: the farmer reports on Flutter, the officer approves on React, and the farmer's phone shows the result*

The officer can use the mobile app instead: its review screen calls the same endpoints. The React app shows the farmer the same result. §7.7 records the end-to-end run.

## 3.6 Repository structure

```
AgriLink_SriLanka/                      (web, API, ML)
├── .github/workflows/                  backend-ci.yml, frontend-ci.yml
├── backend/
│   ├── AgriLink.API/
│   │   ├── Controllers/                18 REST controllers
│   │   ├── DTOs/                       request/response contracts per area
│   │   ├── Models/                     EF Core entities and enums
│   │   ├── Data/                       AgriLinkDbContext, seeders, transactions
│   │   ├── Migrations/                 14 EF Core migrations
│   │   ├── Services/                   accounts, images, notifications, audit
│   │   │   └── Agents/                 orchestrator, 6 agents, knowledge bases,
│   │   │       ├── ImageClassification/   ONNX classifier
│   │   │       └── Llm/                   OpenAI-compatible client for Qwen
│   │   └── Program.cs                  DI, auth, CORS, Swagger, health
│   └── AgriLink.API.Tests/             xUnit: Agents, Controllers, Services, Integration
├── frontend/src/
│   ├── app/                            routes, layout, RequireAuth/RequireRole guards
│   ├── auth/                           login, registration, Zustand session store
│   ├── features/                       farms, issues, marketplace, orders, officer,
│   │                                   registrations, account, home
│   ├── components/ui/                  shared components (forms, tables, pagination)
│   ├── lib/                            API client, error mapping, UI stores
│   └── i18n/locales/{en,si,ta}/        translations
├── ml/                                 dataset preparation, training, ONNX export, pytest
├── deploy/                             publish-backend.ps1, start/connect-llm-planner.ps1
└── docs/deployment/                    azure.md, llm-planner.md

AgriLink_Mobile/                        (Flutter)
├── .github/workflows/flutter-ci.yml
├── lib/
│   ├── app/                            router, role shell, theme
│   ├── core/                           API client, session, config, errors, storage
│   ├── features/                       auth, account, farmer, issues, marketplace
│   │                                   (with requests and orders), officer, admin,
│   │                                   notifications
│   └── shared/                         widgets, paged lists, formatting
├── test/                               unit, widget and flow tests with a FakeApi
└── docs/ARCHITECTURE.md                team guide to the mobile code base
```

# 5. React and Flutter design

## 5.2 React web application

- **Structure.** Code is split into feature folders (`farms`, `issues`, `marketplace`, `orders`, `officer`, `registrations`, `account`, `home`), each with `api/` (typed calls), `hooks/` (TanStack Query hooks), `components/` and `pages/`. Shared UI lives in `components/ui`: buttons, dialogs, tables, pagination, the search-and-sort bar, badges and form fields.
- **Routing and guards.** React Router 6 routes are declared per feature. `RequireAuth` redirects signed-out users to login, preserving the target page. `RequireRole` shows the Unauthorised page for the wrong role. Navigation tabs are built from `navConfig` for the signed-in role, so each role sees only its own sections.
- **State management (ADR-001).** Server data is held by **TanStack Query**, which caches, deduplicates, refetches and invalidates after mutations. Client state is held in small **Zustand** stores: the session (token, role, user; persisted), UI preferences (theme, sidebar) and language.
- **API integration.** One `apiClient` adds the base URL and the bearer token and converts error responses to typed errors. A 401 clears the session. `mutationErrorMessage` maps server validation messages into the forms.
- **Forms.** React Hook Form with Zod schemas mirrors the server rules (password policy, NIC and phone formats, dates, quantities), and the server's own message is shown when it rejects a value.
- **UI states and accessibility.** Every page has loading skeletons, empty states, error states with retry, and toasts for success and failure. Form fields have labels, and errors are announced with `role="alert"`. There are three languages and light, dark and system themes. The layout was checked at 375 px.

![React application architecture](img/g04-react-architecture.png)
*React application architecture*

![The live React application: the public marketplace with server-side search, filters and sorting](img/live-marketplace.png)
*The live React application: the public marketplace with server-side search, filters and sorting*

**Main React screens by role**

| Role | Screens |
|---|---|
| Visitor | Home page with live marketplace preview, marketplace, login, admin login, registration |
| Farmer | Farms → fields → crops (CRUD), report an issue (with photo), my issues and advisories, my listings, purchase requests received, orders, notifications, profile and security |
| Buyer | Marketplace, listing detail and request, sent requests, orders, notifications, profile |
| Officer | District dashboard, pending issues (search, sort, paging), advisory review (photo, trace, reasons, approve, reject or revise), reviewed issues, registrations and profile-change approvals |
| Admin | Dashboard with charts, users (search, filter, sort, paging; create officers; role, status, password, profile), departments, all issues, registrations, audit log |

## 5.3 Flutter mobile application

- **Structure.** Each feature under `lib/features/` has `data/` (API classes and models), `application/` (Riverpod providers and notifiers) and `presentation/` (screens and widgets). Shared widgets cover loading, error with retry, empty states, paged lists, forms, badges, dialogs and the photo picker.
- **State management (ADR-002).** Riverpod 3. API objects are `Provider`s, loaded data uses `FutureProvider.autoDispose`/`.family`, and changing state uses `Notifier`/`AsyncNotifier`. Every user-data provider watches the session token, so signing out clears all cached data at once.
- **Navigation.** go_router with a role shell: each role gets its own bottom navigation and "More" sections. Route guards redirect by session status and role, so a farmer cannot open officer routes even by deep link.
- **API integration and security.** A single Dio client adds the token and maps errors to typed `ApiException`s with the server's message. The JWT is stored in Android's encrypted storage (`flutter_secure_storage`) and restored at start-up. An expired token is discarded, and a 401 signs the user out.
- **Device features.** The **camera and gallery** (`image_picker`) with a runtime permission explanation; photos are resized to 1600 px and re-encoded as JPEG with EXIF (including GPS) removed. **Local notifications** (`flutter_local_notifications`) announce new server notifications, polled every 60 seconds and when the app returns to the foreground. **Date pickers** are used for planting, harvest and listing dates.
- **Screens.** Registration with validation, login, logout; the farmer's farms, fields, crops, issue reporting, issue history and advisories; browsing, filtering and listing harvests, requests and orders with status tabs; the officer's dashboard, approvals and the advisory review with approve, reject or revise; the admin dashboard, users, departments, all issues and audit log; notifications; profile and security. Every screen has loading, empty and error states; the widget tests run at 320 px as well as normal phone widths. Translations are shared with the web app through a generator (`tool/import_web_translations.dart`).

**Flutter technology stack**

| Area | Technology | Purpose |
|---|---|---|
| Framework and language | Flutter 3.47.5, Dart 3.13.4 | Cross-platform UI, built and tested for Android |
| State management | Riverpod 3 | Application and asynchronous state |
| Navigation | go_router | Declarative routes, role shell and guards |
| HTTP | Dio (one `ApiClient`) | Bearer token, timeouts, typed `ApiException`s, paged responses |
| Secure storage | flutter_secure_storage | The JWT, in Android's encrypted storage |
| Local preferences | shared_preferences | Language, theme and small settings |
| Images | image_picker, flutter_image_compress | Camera or gallery photo, resized and re-encoded before upload |
| Permissions | permission_handler | Camera and notification permissions, explained first |
| Notifications | flutter_local_notifications | Android notifications for new server notifications |
| Localisation | gen-l10n with ARB files | English, Sinhala and Tamil, imported from the web translations |
| Testing and linting | flutter_test, mocktail, flutter_lints | 515 tests with a fake API; `flutter analyze` with no issues |

![Flutter application architecture](img/g04-flutter-architecture.png)
*Flutter application architecture*

![The Flutter app on an Android emulator during the final system test on 29 September 2026: the farmer's issue workflow](img/mobile-farmer.png)
*The Flutter app on an Android emulator during the final system test on 29 September 2026: the farmer's issue workflow*

![The Flutter app: device permissions, the officer's review screen and registration](img/mobile-officer.png)
*The Flutter app: device permissions, the officer's review screen and registration*

The REST API design is in [../api.md](../api.md).
