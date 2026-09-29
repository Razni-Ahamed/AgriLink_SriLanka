# Performance report

> Part of the AgriLink Sri Lanka project documentation ([index](README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 9. Performance report

## 9.1 Method

Performance was measured in two settings:

1. **Load tests on a local deployment.** These ran on 29 September 2026, as the last section of the API system test (§7.7). The Release build of the API ran on the team laptop against a local PostgreSQL 18 cluster created for the test: Intel Core Ultra 9 275HX, 32 GB RAM, Windows 11. A Python client sent requests from a thread pool with a fixed number of parallel workers, recorded each request's latency and status, and computed the median (p50), 95th percentile (p95), maximum and throughput. The Open-Meteo calls in the AI pipeline were real. Load tests were **not** run against production, so that the shared free-tier services were not disrupted.
2. **A read-only latency sample of the live system,** taken on 29 September 2026 at 15:45 UTC: 20 sequential requests to each of four public URLs, from Sri Lanka.

## 9.2 Load test results

**Local load test results (all requests succeeded)**

| Scenario | Requests × parallel | Success | p50 | p95 | max | Throughput |
|---|---|---|---|---|---|---|
| Marketplace browse, signed out | 500 × 50 | 100 % | 33 ms | 53 ms | 65 ms | 1,110 req/s |
| Login (password hashing) | 100 × 25 | 100 % | 57 ms | 70 ms | 84 ms | 376 req/s |
| Mixed signed-in reads, all four roles | 400 × 40 | 100 % | 30 ms | 64 ms | 230 ms | 782 req/s |
| Farm creation (database writes) | 100 × 20 | 100 % | 14 ms | 21 ms | 40 ms | 1,074 req/s |
| AI pipeline, text report (live Open-Meteo call) | 30 × 10 | 100 % | 170 ms | 589 ms | 590 ms | 32 runs/s |
| AI pipeline, photo report (ONNX) | 12 × 6 | 100 % | 95 ms | 106 ms | 111 ms | 54 runs/s |

Single runs outside the load test took 1.1 s for the first text report, including the first Open-Meteo connection, and 0.38 s for the first photo report, including the model warm-up.

## 9.3 Concurrency and consistency under load

**Race-condition tests (the correct result each time)**

| Scenario | Result |
|---|---|
| 10 parallel registrations with the same email | Exactly one 201; the other nine refused (400 or 409); no 500 |
| 5 parallel acceptances of 30 kg requests on a 100 kg listing | Never oversold: the first acceptance won (30 kg sold, 70 kg left). The other four got 409 "changed at the same time" and can be retried; stock stayed consistent |
| Parallel "complete" and "cancel" requests on one order | Exactly one succeeded (200); the rest got 409 |
| Parallel creation of departments with one name | One 201, the rest 409 (a 500 before the fix in #69) |

## 9.4 Agentic AI latency

**Latency of the agent workflow and its parts**

| Part | Measured latency |
|---|---|
| Whole text pipeline under load (10 parallel) | p50 170 ms, p95 589 ms; the weather call dominates |
| Whole photo pipeline under load (6 parallel) | p50 95 ms, p95 106 ms (ONNX EfficientNet-B0 on CPU) |
| Planner with Qwen 3.8 27B (live evaluation, §8.5) | 2.2 to 6.3 s per plan; timeout 20 s per attempt |
| Language-model call through the ngrok tunnel from the internet | 1.4 s for a minimal authorised request (29 Sep 2026) |
| Fallback when the model is unreachable | Immediate for a refused connection, so no delay; at most 2 × 20 s for a model that hangs |

The language model adds seconds to issue submission, which is acceptable for a report the farmer submits once and an officer reviews later. Rules-only planning takes microseconds.

## 9.5 Database response

Paged, indexed queries kept signed-in reads at a 30 ms median, including authentication and the per-request account check, and writes at a 14 ms median on the local database. Every list that can grow (issues, notifications, audit log, change requests, users) is paged in the database: `Skip/Take` with a total count and a 100-item page limit. Search and sorting are translated to SQL, including the review-queue order, which is a correlated subquery.

## 9.6 Live system sample

**Live latency, 20 sequential requests each (29 Sep 2026, 15:45 UTC)**

| URL | OK | p50 | p95 | max | mean |
|---|---|---|---|---|---|
| Website home page (Static Web Apps CDN) | 20/20 | 258 ms | 287 ms | 624 ms | 275 ms |
| `GET /api/harvests` (public marketplace) | 20/20 | 527 ms | 902 ms | 2,085 ms | 624 ms |
| `GET /api/harvests?sort=priceAsc&search=tomato` | 20/20 | 523 ms | 573 ms | 602 ms | 528 ms |
| `GET /health` (includes a database check) | 20/20 | 1,705 ms | 1,991 ms | 3,254 ms | 1,774 ms |

A cold start was also observed. The first request after an idle period (the Swagger document) took **32.6 s** while the F1 instance started.

## 9.7 Performance-oriented design

- **Paging.** Lists that grow (issues, review queues, notifications, audit log, change requests) are paged in the database. The mobile app uses one reusable `PagedListController` with infinite scroll and pull-to-refresh.
- **Smaller photos.** The mobile app resizes photos to 1600 px on the long side and re-encodes them as JPEG before upload. The API also caps uploads at 5 MB and re-encodes them, which keeps both upload time and classification time predictable.
- **In-process inference.** The ONNX models run inside the API, with no call to a separate model service. They are loaded once at start-up, so the first farmer's upload does not pay the loading cost, and a missing model shows up in the start-up log.
- **Timeouts sized to the work.**
  - The mobile API client waits up to 30 s to connect, 45 s for a normal answer and 60 s to send.
  - Issue submission, which runs the agents, waits up to 120 s.
  - The report screen shows "Analysing your crop…" and disables Back while the request runs, to prevent duplicate submissions.
- **Caching.** TanStack Query on the web and Riverpod providers on mobile cache server data and refetch only what a change affects.

## 9.8 Analysis and recommendations

- **Local results are excellent,** with p95 under 70 ms for normal reads and writes at up to 50 parallel users. The API code and queries are not the bottleneck.
- **The live system is slower because of hosting choices, not code.**
  - The API runs in an Azure region in India on the free F1 plan: shared CPU, no always-on, and a 60-minutes-a-day CPU quota.
  - The Neon database is in AWS us-east-2.
  - Every query therefore crosses continents: about 0.5 s for a marketplace page.
  - The health check opens a new database connection each time, which explains its 1.7 s.
- **Recommendations for production use:**
  1. Put the API and database in the same region (for example Neon in AWS ap-southeast-1 with Azure Southeast Asia).
  2. Use a Basic (B1) plan with always-on to remove cold starts.
  3. Add response caching for the public marketplace.
  4. Add ASP.NET Core rate limiting to protect the shared resources.
