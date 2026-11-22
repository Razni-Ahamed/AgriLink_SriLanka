# API cold starts: what happens and how to shorten them

> Part of the AgriLink Sri Lanka deployment notes ([deployment report](README.md), [azure.md](azure.md)).

## What a cold start is

The API runs on Azure App Service **F1 (Free)**, which has no Always On. After about 20 minutes
without requests, Azure unloads the app. The next request then waits for three things in turn:

1. **The platform starts the app.** Azure allocates a shared worker, starts the container and the
   .NET runtime. This is most of the observed 30–40 s (32.6 s measured on 29 Sep 2026, §9.6), and no
   code change can remove it.
2. **The API's own start-up.** Until this change it ran every pending EF Core migration check, the
   username backfill, role and admin seeding (about ten database round trips from Azure in India to
   Neon in AWS us-east-2), and loaded every ONNX photo model, all **before** serving anything.
3. **The database wakes up.** Neon's free compute suspends after a few idle minutes; the first query
   after that waits for it to resume.

## What the code now does

| Change | Effect |
|---|---|
| Photo models load **in the background** after the API starts listening (`ImageClassifierWarmup`), and on first use if a photo arrives sooner. | Model loading no longer delays the first request. A missing or invalid model is still logged at start-up. |
| Migrations, the username backfill and seeding (`StartupDatabaseTasks`) can run **at deploy time** instead of on every start: set `Database__MigrateOnStartup=false` and deploy with `deploy/publish-backend.ps1`, which then runs `--migrate` before uploading. | Removes the database round trips (and the Neon wake-up they forced) from start-up. |
| The publish script builds with **ReadyToRun** (precompiled code). | Less JIT work on the slow shared CPU, both at start-up and on the first real requests. |
| A new **`/health/live`** endpoint answers without touching the database. | Lets a keep-warm ping keep the App Service loaded without also keeping Neon awake. `/health` still checks the database. |

Measured locally (Release build, local PostgreSQL, so database round trips cost almost nothing; the
saving on F1 with Neon in another continent is larger):

| Build | First response from the process | First `GET /api/harvests` |
|---|---|---|
| Before (`main`) | 1.6–1.8 s | 1.9 s |
| After, `MigrateOnStartup` true (default) | 1.0 s (ReadyToRun) | 1.3 s |
| After, `MigrateOnStartup` false | 0.4 s | 1.1 s |

`Database:MigrateOnStartup` defaults to **true**, so a new environment and local development behave
exactly as before. Nothing changes in production until the setting below is applied.

## Turning on deploy-time migrations (manual, one time)

```powershell
az webapp config appsettings set -g agrilink-rg -n agrilink-api-sl --settings "Database__MigrateOnStartup=false"
```

From then on, always deploy with `.\deploy\publish-backend.ps1`. When it sees the setting is false it
reads the App Service settings (connection string, `Jwt__*`, `AdminSeed__*`) into its own process
only, runs `dotnet run --project backend/AgriLink.API -- --migrate`, and uploads the new build only if
that succeeded. Take the usual `pg_dump` backup first when the release has a migration.

To migrate by hand (for example from another machine), set the same environment variables and run
`dotnet AgriLink.API.dll --migrate` (or `dotnet run --project backend/AgriLink.API -- --migrate`). It
applies pending migrations, backfills usernames, seeds roles and the admin, and exits. Every step is
idempotent, so running it twice is harmless.

To go back, set `Database__MigrateOnStartup=true` (or delete the setting).

## Hosting options for the remaining wait

These are settings for whoever manages the Azure subscription; none of them is applied by the code.

| Option | Cost | What it fixes | Caveats |
|---|---|---|---|
| **Keep-warm ping on F1.** An external uptime monitor (for example UptimeRobot or cron-job.org, both free) requests `https://agrilink-api-sl.azurewebsites.net/health/live` every 5–10 minutes. | Free | Users rarely meet the platform start (step 1). | Azure can still recycle the instance (maintenance, the daily CPU quota), so an occasional cold start remains. Each ping uses a little of F1's 60 CPU-minutes a day. Use `/health/live`, not `/health`, unless you also want to keep Neon awake (next row). A scheduled GitHub Actions workflow is a poor substitute: schedules are often delayed by 10+ minutes, use Actions minutes on a private repository, and stop after 60 days without repository activity. |
| **Also keep the database awake:** ping `/health` instead. | Free, but uses Neon compute hours | Also removes the Neon wake-up (step 3). | Neon's free plan has a monthly compute-hour allowance; a database that never suspends can use most or all of it. Check the usage page in the Neon console before choosing this. |
| **Basic B1 plan with Always On.** `az appservice plan update -g agrilink-rg -n agrilink-plan --sku B1`, then `az webapp config set -g agrilink-rg -n agrilink-api-sl --always-on true`. | Paid, roughly US$13 a month for Linux B1 in most regions (check the Azure pricing calculator for your region); Azure for Students credit can cover it | Removes cold starts and the daily CPU quota. | Ends the "everything on free tiers" property of the deployment (§10.1). |
| **Database near the API.** Create the Neon project in a region close to the API's Azure region (for example AWS Singapore), or move the API next to Neon. | Free | Every query, including start-up and the first request, crosses less distance (about 0.5 s per marketplace page today, §9.8). | Needs a database move: `pg_dump` / `pg_restore` and a new connection string. |

**Recommendation:** apply `Database__MigrateOnStartup=false` and add a free 5-minute keep-warm ping
on `/health/live`. Together they remove almost every cold start a user would see while staying on
free tiers. Move to B1 with Always On only if the API needs to be reliably fast at any moment.
