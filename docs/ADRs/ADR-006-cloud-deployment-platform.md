# ADR-006: Cloud deployment platform

**Status:** Accepted (2026-09-21), PR #52.

**Context.** Required: an ASP.NET Core 8 API with a health URL and Swagger, a React single-page app on a public URL, a secure PostgreSQL database with migrations, and access for evaluators until 21 October 2026. All of it on free or student services. The team members have Azure for Students subscriptions, and the database was already running on Neon during development.

**ADR-006 options**

| Option | For | Against |
|---|---|---|
| Render / Railway (API) + Vercel / Netlify (web) | Simple git-based deploys | Free tiers sleep or have limited hours; .NET support through Docker only |
| Azure Database for PostgreSQL | Same cloud as the API | Uses up the student credit quickly; nothing free after the trial |
| **Azure App Service F1 (API) + Azure Static Web Apps Free (web) + Neon (PostgreSQL)** | First-class .NET 8 hosting, app settings for secrets, log stream, `az` CLI scripts; Static Web Apps has a free CDN and SPA fallback; Neon has free serverless PostgreSQL with TLS and branching | F1 cold starts and a CPU quota; API and database in different regions |

**Decision.** Deploy the API to **Azure App Service (Linux, F1)** with scripted zip deployment, the web app to **Azure Static Web Apps (Free)**, and keep the database on **Neon PostgreSQL**. Configuration and secrets are in App Service settings. Migrations run at start-up, and backups are taken with `pg_dump` before schema changes.

**Consequences.**

- (+) Zero cost, repeatable deploys (`deploy/publish-backend.ps1`), HTTPS everywhere, and the health and Swagger URLs as required.
- (−) Cold starts of 20–40 s after idle periods.
- (−) Cross-region latency: about 0.5 s for a database-backed read (§9.6).
- (−) Deployment is a manual step from `main`. It could be moved to GitHub Actions with a publish profile secret.
