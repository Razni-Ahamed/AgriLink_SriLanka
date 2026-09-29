# AgriLink Sri Lanka

**Connecting Sri Lankan farmers, agricultural officers and buyers in one place.**

AgriLink is a web and Android platform for Sri Lankan agriculture. Farmers keep records of their farms and crops, report crop problems (with photos) and get advice checked by an agricultural officer. They can also sell their harvest directly to buyers. Both apps are available in **English, Sinhala (සිංහල) and Tamil (தமிழ்)**, in light and dark themes.

🌐 **Live site:** https://green-glacier-04e1ebf00.1.azurestaticapps.net · **API:** https://agrilink-api-sl.azurewebsites.net ([Swagger](https://agrilink-api-sl.azurewebsites.net/swagger), [health](https://agrilink-api-sl.azurewebsites.net/health)) · **Mobile app:** [AgriLink_Mobile](https://github.com/Razni-Ahamed/AgriLink_Mobile)

> © 2026 the AgriLink authors. All rights reserved. This repository is public for viewing only — see [Licence](#licence).

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [How crop advice works](#how-crop-advice-works)
- [Database design](#database-design)
- [API](#api)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Running it locally](#running-it-locally)
- [Tests](#tests)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Team and contributions](#team-and-contributions)
- [Challenges](#challenges)
- [Security](#security)
- [AI usage declaration](#ai-usage-declaration)
- [Licence](#licence)

---

## Features

AgriLink has four roles. Farmers and buyers register themselves, and an officer or admin approves each new account before it can be used. Officer accounts are created by an admin.

### 👩‍🌾 Farmers
- Manage **farms, fields and crops**
- **Report crop problems** with a description and a photo (camera or gallery on the phone)
- Receive an **advisory**: a diagnosis and treatment plan that an officer reviews
- **List harvests** on the marketplace and handle buyers' purchase requests
- Track **orders** and get **notifications**

### 🧑‍💼 Agricultural officers
- A **dashboard** for their district
- **Review reported issues**, then approve, edit or reject the advisory before the farmer relies on it
- **Approve new registrations** and profile change requests

### 🛒 Buyers
- **Browse harvests** by crop, district and price, with search and sorting. Browsing is public, so no account is needed.
- Send **purchase requests** to farmers and follow the resulting **orders**

### 🛡️ Administrators
- A **dashboard** with platform metrics
- **Manage users**, including creating officer accounts, and **departments**
- View all issues, approve registrations and read the **audit log**

### Across the platform
- A public **home page** with a live marketplace preview
- **Profiles** with photos, username changes and security settings; sensitive changes go through approval
- **Multilingual UI** (English / Sinhala / Tamil) and light / dark / system themes
- The **web app** focuses on review, administration and dashboards; the **mobile app** on work in the field. Both use the same API, accounts and rules.

---

## Architecture

![AgriLink architecture](docs/architecture/img/diagram-architecture.png)

- **One API for both clients.** The React web app and the Flutter Android app talk only to the ASP.NET Core Web API. The API owns identity, permissions, validation, business rules, persistence and the Agentic AI workflow.
- **The agents run inside the API.** So do the ONNX photo models, so no separate Python service is hosted.
- **External services sit behind the API,** each with a timeout and a safe fallback: PostgreSQL (Neon), Open-Meteo (weather), Cloudinary (photos) and the optional Qwen language model.

Details: [docs/architecture](docs/architecture/README.md) · decisions: [docs/ADRs](docs/ADRs/README.md)

---

## How crop advice works

When a farmer reports a problem, the backend runs it through a pipeline of small, specialised **agents**. The result is always a *draft* until an officer signs it off.

```
Farmer reports an issue (text + optional photo)
        │
        ▼
Image Classification agent ── an ONNX model per crop (Tomato, Potato, Cassava)
        │                      identifies the disease from the photo, when one is supplied
        ▼
Planner agent ────────────── decides which analyses the issue needs (Qwen LLM, checked by rules)
        │
        ├──► Photo Triage agent ──── decides whether a photo diagnosis must go to an officer
        ├──► Crop Analysis agent ─── matches symptoms against a crop knowledge base
        └──► Weather agent ───────── fetches the district's last 7 days (Open-Meteo)
        │
        ▼
Validation agent ── reconciles the findings, applies business rules, sets risk and confidence
        │
        ▼
Advisory draft ──► Officer review (approve / edit / reject) ──► Farmer is notified
```

- **Officer sign-off is always required.** The system never gives a farmer an unreviewed treatment.
- **The Planner can use a language model:** Qwen 3.8 27B in LM Studio on a team laptop, reached from Azure through a key-protected ngrok tunnel.
  - Its JSON plan is checked against an allow-list of agents and business rules before it is used.
  - When the laptop is off, keyword rules plan instead.
  - See [`docs/deployment/llm-planner.md`](docs/deployment/llm-planner.md).
- **The photo models** are trained in Python (`ml/`) and exported to **ONNX**.
  - They run *inside* the .NET API through ONNX Runtime.
  - Accuracy is 99–100 % on lab photos but only 50–70 % on field photos, so photo advice always goes to an officer.
- **No photo model.** If a photo can't be classified (a crop without a model, such as Paddy, or an unreadable image), the issue continues through the text-based agents.
- **Every run is recorded** as a workflow with one step per agent: input, structured output, timings and status. Officers see this trace, and the audit log records every decision.
- **Evaluation** uses rule-based golden cases for planning, delegation, tool use, validation, approval, prompt injection and failure recovery, plus a live language-model evaluation. See [`docs/agentic-ai-evaluation.md`](docs/agentic-ai-evaluation.md).

---

## Database design

PostgreSQL, accessed through EF Core 8 (code first). It has 22 application tables plus the ASP.NET Identity tables, 14 migrations, 32 foreign keys and 70 indexes. The design also uses:

- `xmin` row versions on listings, requests and orders
- `jsonb` for the agent workflow's step inputs and outputs
- `CreatedAt`/`UpdatedAt` on every business table, with `UpdatedAt` set automatically

![ER overview](docs/database/img/diagram-er-overview.png)

Details, ER diagrams per area and the full data dictionary: [docs/database](docs/database/README.md)

---

## API

The REST API has **80 operations** in 18 controllers.

- **Swagger:** https://agrilink-api-sl.azurewebsites.net/swagger. Use **Authorize** with the token from `POST /api/auth/login`.
- **Auth:** JWT bearer authentication, role-based authorisation, and ownership and district checks on every request.
- **Errors:** `application/problem+json` for server errors, and paged responses for lists that grow.

Conventions and every endpoint with the roles allowed to call it: [docs/api.md](docs/api.md)

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Web** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, React Hook Form + Zod, i18next, Motion, Recharts, Phosphor Icons |
| **Mobile** | Flutter 3.47 (Dart 3.13), Riverpod 3, go_router, Dio, flutter_secure_storage, image_picker, flutter_local_notifications ([AgriLink_Mobile](https://github.com/Razni-Ahamed/AgriLink_Mobile)) |
| **Backend** | ASP.NET Core 8 Web API, Entity Framework Core 8, ASP.NET Identity + JWT authentication, Swagger |
| **Database** | PostgreSQL (hosted on Neon) |
| **AI / ML** | Custom agent orchestration in C#; Qwen 3.8 27B via LM Studio (Planner, optional); PyTorch (training), ONNX + ONNX Runtime (inference in .NET), SkiaSharp (image decoding) |
| **Services** | Cloudinary (photo storage), Open-Meteo (weather forecasts), ngrok (language-model tunnel) |
| **Hosting** | Azure Static Web Apps (frontend), Azure App Service (API) |
| **Testing** | xUnit + PostgreSQL integration tests (backend), Vitest + Testing Library (web), flutter_test (mobile), pytest (ML) |

---

## Repository layout

```
AgriLink_SriLanka/
├── frontend/          React + TypeScript web app
│   └── src/
│       ├── app/           routing, layout, route guards
│       ├── auth/          login, registration, session store
│       ├── features/      one folder per area: home, farms, issues, marketplace,
│       │                  orders, officer, registrations, account
│       ├── components/ui/ shared UI components and icons
│       └── i18n/          English, Sinhala and Tamil translations
├── backend/
│   ├── AgriLink.API/        ASP.NET Core Web API
│   │   ├── Controllers/     REST endpoints
│   │   ├── Services/Agents/ advisory pipeline, photo classifier, language-model client
│   │   ├── Data/ Models/ Migrations/   EF Core data model
│   │   └── DTOs/
│   └── AgriLink.API.Tests/  backend tests (unit, controller, agent evaluation, PostgreSQL integration)
├── ml/                Model training, evaluation and ONNX export (see ml/README.md)
├── deploy/            Deployment and language-model scripts
└── docs/              Architecture, database, API, testing, security, ADRs and deployment
```

The Flutter app for Android is in its own repository, [AgriLink_Mobile](https://github.com/Razni-Ahamed/AgriLink_Mobile), and uses this same API.

---

## Running it locally

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) and npm
- A PostgreSQL database. A free [Neon](https://neon.tech) project works; so does a local Postgres.
- *Optional:* a Cloudinary account (photos are stored on local disk without one)
- *Optional:* Python 3.12, only to train the photo models (see [`ml/README.md`](ml/README.md))
- *Optional:* LM Studio and ngrok, only for the Planner's language model (see [`docs/deployment/llm-planner.md`](docs/deployment/llm-planner.md))

### Startup order

1. PostgreSQL
2. The API (migrations and the admin account are applied on start-up; the agents start with it)
3. The web app
4. The mobile app
5. *Optional:* the language model

### 1. Backend API

Secrets are never committed. Store them with .NET user-secrets:

```bash
cd backend/AgriLink.API

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<host>;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true"
dotnet user-secrets set "Jwt:Key" "<a random string of 64+ characters>"
dotnet user-secrets set "Jwt:Issuer" "AgriLinkApi"
dotnet user-secrets set "Jwt:Audience" "AgriLinkClient"
dotnet user-secrets set "AdminSeed:Email" "admin@local.test"
dotnet user-secrets set "AdminSeed:Password" "<a strong local password>"
dotnet user-secrets set "AdminSeed:FullName" "AgriLink Administrator"

# Optional — without these, photos are saved to local disk
dotnet user-secrets set "Cloudinary:CloudName" "<cloud name>"
dotnet user-secrets set "Cloudinary:ApiKey" "<api key>"
dotnet user-secrets set "Cloudinary:ApiSecret" "<api secret>"
```

> Npgsql needs the **key/value** connection-string format shown above. Neon's `postgresql://…` URL form is rejected.

Run the API:

```bash
dotnet run --launch-profile http
```

The API starts on **http://localhost:5266**. Database migrations and the admin account are applied automatically on startup. Swagger UI is at http://localhost:5266/swagger.

**Photo diagnosis:** the trained models live in `ml/models/` and are not committed. Without them the API still works, and issues go through the text-based agents only.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:5266
npm install
npm run dev
```

Open **http://localhost:5173**. Sign in as the seeded admin to create officer accounts, or register as a farmer or buyer and approve the account as an officer or admin.

### 3. Mobile app

See the [AgriLink_Mobile README](https://github.com/Razni-Ahamed/AgriLink_Mobile). On an Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5266
```

### Environment variables (deployed API)

On Azure the same settings are App Service application settings. Only the names are listed here:

| Name | Purpose |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection |
| `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` | JWT signing key, issuer and audience |
| `AdminSeed__Email`, `AdminSeed__Password`, `AdminSeed__FullName` | The administrator created at first start-up |
| `Cloudinary__CloudName`, `Cloudinary__ApiKey`, `Cloudinary__ApiSecret` | Photo storage |
| `Cors__AllowedOrigins` | Allowed web origins |
| `Swagger__Enabled` | Swagger UI outside Development |
| `Llm__Enabled`, `Llm__BaseUrl`, `Llm__Model`, `Llm__ApiKey` | The Planner's language model (optional) |
| `VITE_API_BASE_URL` (web build), `API_BASE_URL` (Flutter `--dart-define`) | Where the clients find the API |

---

## Tests

```bash
# Frontend — unit and component tests, lint, type-check and build
cd frontend
npm run test -- --run
npm run lint
npm run build

# Backend: unit, controller, agent golden-case evaluation and (optionally) PostgreSQL integration tests
cd backend
dotnet test
# The PostgreSQL integration tests (migrations, constraints, transactions, row versions) run when
# AGRILINK_TEST_POSTGRES points at a server they may create a throwaway database on, for example:
#   AGRILINK_TEST_POSTGRES="Host=localhost;Username=postgres;Password=<password>;Database=postgres" dotnet test
# The live language-model evaluation runs when AGRILINK_TEST_LLM_URL is set (see docs/deployment/llm-planner.md).

# ML
cd ml
.venv/Scripts/python -m pytest tests
```

Latest results (29 September 2026): **backend 656 passed** (2 skipped that need local resources), **web 302 passed**, **Flutter 515 passed**, ML 36 passed.

GitHub Actions runs on every push and pull request to `main`:

- **Backend CI** restores, builds and runs all backend tests, including the PostgreSQL integration tests against a PostgreSQL 16 service container.
- **Frontend CI** runs lint, build and tests.
- **Flutter CI** (in AgriLink_Mobile) runs `flutter analyze` and `flutter test`.

Test strategy, results, manual test cases and the full test inventory: [docs/testing.md](docs/testing.md).

---

## Deployment

| Part | Host |
|---|---|
| Frontend | Azure Static Web Apps (Free) |
| API | Azure App Service, Linux (F1) |
| Database | Neon PostgreSQL |
| Mobile | Signed release APK |

| Live URL | |
|---|---|
| Website | https://green-glacier-04e1ebf00.1.azurestaticapps.net |
| API | https://agrilink-api-sl.azurewebsites.net |
| Health check | https://agrilink-api-sl.azurewebsites.net/health |
| Swagger UI | https://agrilink-api-sl.azurewebsites.net/swagger |

**Test accounts** for evaluators are given in the submitted report, not here, because this repository is public.

For the one-time setup and the redeploy commands, see [`docs/deployment/azure.md`](docs/deployment/azure.md). The full deployment report is in [`docs/deployment`](docs/deployment/README.md). The API runs on a free tier, so the first request after it has been idle can take 20–40 seconds.

---

## Documentation

Everything is indexed in [`docs/`](docs/README.md):

- [requirements](docs/requirements.md)
- [architecture](docs/architecture/README.md)
- [database](docs/database/README.md)
- [API](docs/api.md)
- [technical report](docs/technical-report.md)
- [testing](docs/testing.md)
- [Agentic AI evaluation](docs/agentic-ai-evaluation.md)
- [performance](docs/performance.md)
- [deployment](docs/deployment/README.md)
- [security](docs/security.md)
- [Architecture Decision Records](docs/ADRs/README.md)
- [AI usage declaration](docs/AI_Logs/README.md)
- [references](docs/references.md)

---

## Team and contributions

AgriLink Sri Lanka was designed and built by four students. Each owned one business component end to end (API, database, web, mobile, tests) and one agent.

| Member | Component | Agent | Mobile phase | Key pull requests |
|---|---|---|---|---|
| **Razni Ahamed M. R.** | A. Farm and Crop Management; also the data model, authentication, officer and admin areas, deployment | Planner and orchestration; also Image Classification and Photo Triage | 1. Foundation | #6, #7, #20, #21, #38, #44, #52, #69–#71; mobile #2 |
| **Gayathri M. G. K.** | B. Crop Issue Reporting and AI Advisory; also account security and profile changes | Crop Analysis (with its knowledge base) | 2. Farmer | #8, #30, #34, #54, #57; mobile #3, #6 |
| **Fernando C. P. H. A. C.** | C. Harvest Marketplace and Purchase Requests; also registration validation | Weather (Open-Meteo tool) | 4. Officer and admin | #11, #17, #23, #24, #35, #55; mobile #5, #7 |
| **Jayaweera A.J.D.** | D. Orders, Notifications and Analytics; also registration approval and profiles | Validation | 3. Marketplace and orders | #12, #15, #26, #28, #50, #56; mobile #4 |

---

## Challenges

- **Overselling.** Two buyers could accept the last stock at the same moment. PostgreSQL row versions now make the second acceptance fail with 409, and parallel tests prove it.
- **Photo models.** They were near-perfect on lab photos but weak on field photos. We measured this separately, used statistically bounded per-class thresholds, and keep an officer in the loop.
- **The language model.** Its output had to be safe to use, so it goes through a strict JSON schema, a parser with an allow-list, business-rule guardrails, isolation of the farmer's text, timeouts and a rules fallback.
- **Stale sessions.** A deactivated account or a changed password must end existing sessions at once, so the account is checked on every request.
- **Free hosting.** Cold starts, a CPU quota and a database in another region.

More in [docs/technical-report.md](docs/technical-report.md#69-challenges-and-how-they-were-solved).

---

## Security

- **Passwords and sign-in.** Hashed by ASP.NET Identity, with at least 12 characters, a mix of character types, and lockout after 5 failed attempts.
- **Tokens.** JWTs are signed and validated on issuer, audience, lifetime and signature. They are revoked on every request when an account is deactivated or its password changes.
- **Authorisation.** Roles on every endpoint, plus ownership and district checks.
- **Secrets.** Only in user-secrets and App Service settings, never in Git.
- **Transport.** HTTPS only, and CORS limited to the website.
- **Uploads.** Photos are decoded and re-encoded with EXIF (including GPS) removed. Issue photos are stored as authenticated assets.
- **Agentic AI.** Prompt-injection isolation, output validation, least-privilege tools, timeouts and retry limits, and mandatory human approval.

Threats, controls and residual risks: [docs/security.md](docs/security.md).

---

## AI usage declaration

The project was built under the SE3090 **Level 4 (Full AI)** rules. AI coding assistants were used and disclosed, among them Claude Code with Claude models. Every change was reviewed by the member who owns that area, merged through pull requests with CI, and checked in the running application. The team can explain, test and modify all of it.

The **Qwen** model is part of the product (the Planner agent), not a development tool. The declaration is in [docs/AI_Logs](docs/AI_Logs/README.md), and each member's AI usage log and reflection are in the submitted report.

---

## Licence

**Copyright © 2026 Razni Ahamed M. R., Gayathri M. G. K., Jayaweera A.J.D. and Fernando C. P. H. A. C. All rights reserved.**

This is **not** open-source software. The repository is public so that it can be viewed. No permission is granted to copy, modify, distribute or deploy the code, or to present any part of it as your own work. That includes submitting it for any academic assessment. Any other use needs written permission from all of the authors. See [`LICENSE`](LICENSE) for the full terms.

Third-party libraries and datasets used by this project remain under their own licences.
