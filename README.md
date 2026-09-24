# AgriLink Sri Lanka

**Connecting Sri Lankan farmers, agricultural officers and buyers in one place.**

AgriLink is a web platform for Sri Lankan agriculture. Farmers keep records of their farms and crops, report crop problems (with photos) and get advice checked by an agricultural officer. They can also sell their harvest directly to buyers. The whole interface is available in **English, Sinhala (සිංහල) and Tamil (தமிழ்)**, in light and dark themes.

🌐 **Live site:** https://green-glacier-04e1ebf00.1.azurestaticapps.net

> © 2026 the AgriLink authors. All rights reserved. This repository is public for viewing only — see [Licence](#licence).

---

## Contents

- [Features](#features)
- [How crop advice works](#how-crop-advice-works)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Running it locally](#running-it-locally)
- [Tests](#tests)
- [Deployment](#deployment)
- [Authors](#authors)
- [Licence](#licence)

---

## Features

AgriLink has four roles. Farmers and buyers register themselves, and an officer or admin approves each new account before it can be used. Officer accounts are created by an admin.

### 👩‍🌾 Farmers
- Manage **farms, fields and crops**, and log crop activities
- **Report crop problems** with a description and photos
- Receive an **advisory**: a diagnosis and treatment plan that an officer reviews
- **List harvests** on the marketplace and handle buyers' purchase requests
- Track **orders** and get **notifications**

### 🧑‍💼 Agricultural officers
- A **dashboard** for their district
- **Review reported issues**, then approve, edit or reject the advisory before the farmer relies on it
- **Approve new registrations** and profile change requests

### 🛒 Buyers
- **Browse harvests** by crop and district. Browsing is public, so no account is needed.
- Send **purchase requests** to farmers and follow the resulting **orders**

### 🛡️ Administrators
- A **dashboard** with platform metrics
- **Manage users**, including creating officer accounts, and **departments**
- View all issues, approve registrations and read the **audit log**

### Across the platform
- A public **home page** with a live marketplace preview
- **Profiles** with photos, username changes and security settings; sensitive changes go through approval
- **Multilingual UI** (English / Sinhala / Tamil) and light / dark / system themes
- Responsive layout that works on phones

---

## How crop advice works

When a farmer reports a problem, the backend runs it through a pipeline of small, specialised **agents**. The result is always a *draft* until an officer signs it off.

```
Farmer reports an issue (text + optional photo)
        │
        ▼
Photo classifier ── an ONNX model per crop (Paddy, Tomato, Potato, Cassava)
        │            identifies the disease from the photo, when one is supplied
        ▼
Planner agent ───── decides which analyses the issue needs
        │
        ├──► Crop analysis agent ── matches symptoms against a crop and disease knowledge base
        └──► Weather agent ──────── fetches the district's forecast (Open-Meteo)
        │
        ▼
Validation agent ── reconciles the findings, checks confidence and flags risks
        │
        ▼
Advisory draft ──► Officer review (approve / edit / reject) ──► Farmer is notified
```

- **Officer sign-off is always required.** The system never gives a farmer an unreviewed treatment.
- The photo models are trained in Python (`ml/`) and exported to **ONNX**. They run *inside* the .NET API through ONNX Runtime, so no separate Python service has to be hosted.
- If a photo can't be classified (unsupported crop, unreadable image or timeout), the issue simply continues through the text-based agents.

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, React Hook Form + Zod, i18next, Motion, Recharts, Phosphor Icons |
| **Backend** | ASP.NET Core 8 Web API, Entity Framework Core 8, ASP.NET Identity + JWT authentication, Swagger |
| **Database** | PostgreSQL (hosted on Neon) |
| **AI / ML** | PyTorch (training), ONNX + ONNX Runtime (inference in .NET), SkiaSharp (image decoding) |
| **Services** | Cloudinary (photo storage), Open-Meteo (weather forecasts) |
| **Hosting** | Azure Static Web Apps (frontend), Azure App Service (API) |
| **Testing** | Vitest + Testing Library (frontend), xUnit (backend), pytest (ML) |

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
│   │   ├── Services/Agents/ advisory pipeline and photo classifier
│   │   ├── Data/ Models/ Migrations/   EF Core data model
│   │   └── DTOs/
│   └── AgriLink.API.Tests/  backend tests
├── ml/                Model training, evaluation and ONNX export (see ml/README.md)
├── deploy/            Deployment scripts
├── docs/              Deployment runbook and design notes
└── mobile/            Placeholder for a future mobile app
```

---

## Running it locally

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) and npm
- A PostgreSQL database. A free [Neon](https://neon.tech) project works; so does a local Postgres.
- *Optional:* a Cloudinary account (photos are stored on local disk without one)
- *Optional:* Python 3.12, only to train the photo models (see [`ml/README.md`](ml/README.md))

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

---

## Tests

```bash
# Frontend — unit and component tests, lint, type-check and build
cd frontend
npm run test -- --run
npm run lint
npm run build

# Backend
cd backend
dotnet test

# ML
cd ml
.venv/Scripts/python -m pytest tests
```

Every pull request that touches `frontend/` runs lint, build and tests on GitHub Actions.

---

## Deployment

| Part | Host |
|---|---|
| Frontend | Azure Static Web Apps (Free) |
| API | Azure App Service, Linux (F1) |
| Database | Neon PostgreSQL |

For the one-time setup and the redeploy commands, see [`docs/deployment/azure.md`](docs/deployment/azure.md). The API runs on a free tier, so the first request after it has been idle can take a few seconds.

---

## Authors

AgriLink Sri Lanka was designed and built by:

- **Razni Ahamed M. R.**
- **Gayathri M. G. K.**
- **Jayaweera A. D. J.**
- **Fernando C. P. H. A. C.**

---

## Licence

**Copyright © 2026 Razni Ahamed M. R., Gayathri M. G. K., Jayaweera A. D. J. and Fernando C. P. H. A. C. All rights reserved.**

This is **not** open-source software. The repository is public so that it can be viewed. No permission is granted to copy, modify, distribute or deploy the code, or to present any part of it as your own work. That includes submitting it for any academic assessment. Any other use needs written permission from all of the authors. See [`LICENSE`](LICENSE) for the full terms.

Third-party libraries and datasets used by this project remain under their own licences.
