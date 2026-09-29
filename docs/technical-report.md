# Technical report

> Part of the AgriLink Sri Lanka project documentation ([index](README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 6. Technical report

This section describes how each component implements its business rules, then the parts they share. Every rule below is enforced by the API. The web and mobile apps repeat some rules as form validation, only for faster feedback.

## 6.1 Component A: Farm and Crop Management (Razni Ahamed M. R.)

- **Ownership.** Every farm, field and crop request is checked against the caller's `FarmerProfile`. Only a user with a farmer profile can create a farm, and another farmer's records return 403.
- **Location.** A farm's district must be one of Sri Lanka's 25 administrative districts (`SriLankaDistricts`). The same list drives the weather tool's coordinates, which is why free text is not accepted.
- **Area rules.** A field cannot be larger than its farm, and a farm cannot be shrunk below its largest field. Both are checked on create and update.
- **Crop rules.** The crop type must come from the supported list (`CropTypes`), and the expected harvest date must be after the planting date. Crops move through `Seeded → Growing → Harvested`. Expected quantity uses `numeric(10,2)`.
- **Delete protection.** A farm or field with crops cannot be deleted. A crop with reported issues or harvest listings cannot be deleted either, because that would erase advisory and sales history. The database repeats this rule with `ON DELETE RESTRICT`.
- **Screens.** On the web, farms → fields → crops, with dialogs whose errors come from the server (fixed in the final check). On mobile, the same hierarchy, plus deleting fields and crops and changing a crop's status.

## 6.2 Component B: Crop Issue Reporting and AI Advisory (Gayathri M. G. K.)

- **Reporting.** `POST /api/issues` (JSON) and `POST /api/issues/with-photo` (multipart, 5 MB limit) accept a title, description and severity (Low, Medium or High) for one of the farmer's own crops.
- **Photo processing.** Every photo is **decoded and re-encoded** rather than stored as sent (`IssuePhotoProcessor`). This proves the file is really an image, whatever content type the browser claimed. It also applies the EXIF rotation, removes all metadata including GPS, and caps the long side at 1600 px. The photo is stored in Cloudinary as an *authenticated* asset. Clients fetch it through `GET /api/issues/{id}/images/{imageId}`, which checks the caller may see that issue.
- **Starting the workflow.** The issue is saved as `AwaitingReview`, then the orchestrator runs (§3.3). The response returns once the advisory draft exists. The district's officers are notified.
- **Review queue.** `GET /api/issues/pending` returns only the officer's district. Issues with no advice yet come first, oldest first, with search and alternative sort orders. `GET /api/issues/reviewed` lists the officer's decisions, and `GET /api/issues` gives admins everything, with a status filter.
- **Decision.** `approve` marks the advisory Approved and the issue Resolved, and replaces the "pending review" closing sentence of the advice. `reject` marks it Rejected. A rejection that carries the officer's own treatment still resolves the issue, which gives the officer a **revise** path. For photo diagnoses, the officer confirms the predicted disease or chooses the correct one. Every decision is audit-logged, and the farmer is notified, including the officer's note.
- **Visibility.** Farmers do not see an advisory while it is a Draft. They see "under review" until an officer decides.
- **Crop Analysis agent and knowledge base.** A rule table of symptom patterns per crop (`CropKnowledgeBase`). Matches produce causes and actions with a confidence of 0.75 for a single cause and 0.55 for several. Contradictory causes and a nutrient diagnosis after recent fertilising are flagged, and the confidence is reduced by 0.2 in the fertiliser case.

## 6.3 Component C: Harvest Marketplace and Purchase Requests (Fernando C. P. H. A. C.)

- **Listing.** A farmer lists a harvest from one of their own crops, with quantity, price per unit (greater than zero), harvest date and collection point. The harvest date cannot be before the crop was planted, and the collection point cannot be blank.
- **Browsing.** `GET /api/harvests` is public. It filters by crop type, district and a price range, searches crop, variety, collection point and district, and sorts by newest, price (both directions), largest quantity or freshest harvest, all in the database.
- **Purchase requests.** A buyer requests a quantity up to what is available, on an active listing, at the listing's current price, which is **locked** on the request.
- **Responding.** The farmer accepts or declines.
  - Accepting subtracts the quantity from `AvailableQuantity` and creates an order at the locked price. When nothing is left, it marks the listing Sold and cancels the other pending requests, notifying their buyers.
  - The listing, request and order carry `xmin` row versions, so two simultaneous acceptances of the last stock cannot both succeed. The loser gets 409 "changed at the same time by someone else".
- **Withdrawing.** A farmer can cancel a listing, and its pending requests are then cancelled. A sold-out listing cannot be reopened.
- **Weather agent.** Described in §3.3. It turns a district into allow-listed coordinates, calls Open-Meteo for the last 7 days of rainfall and temperature, and summarises them. Every failure (unknown district, HTTP error, 429, timeout, unreadable JSON, empty readings) becomes a `WeatherFindings` with `IsFallback = true` instead of an exception.

## 6.4 Component D: Orders, Notifications and Analytics (Jayaweera A.J.D.)

- **Orders.** `GET /api/orders/mine` returns the caller's orders as buyer or as farmer, with both parties' contact details. Only a Confirmed order can be completed or cancelled. Cancelling returns the quantity to the listing. The listing reopens only if sales had sold it out; a listing the farmer marked Sold by hand stays Sold. Both parties are notified.
- **Notifications.** `NotificationService` writes a notification row for each event: registration decisions, profile-change decisions, new and decided advisories, purchase requests and responses, and order changes. Users read them paged, see an unread count, and mark one or all as read. Admins can send a notification to a user. The mobile app polls the unread count every 60 seconds and shows Android notifications.
- **Analytics.** The admin dashboard shows totals for users, farms and crops, issues reported, pending and resolved, and the harvest volume sold this month, with charts (Recharts). The officer dashboard shows the district's pending issues and the officer's reviews today and in total, approved and rejected.
- **Validation agent.** Starts from a risk level based on severity. The baseline confidence is 0.7, reduced by 0.3 without crop findings and by 0.15 without weather. A nitrogen or nutrient-deficiency cause after fertilising in the last two weeks raises the risk one level and lowers the confidence by 0.2. A fungal cause after more than 50 mm of rain raises the confidence by 0.15. Confidence is clamped to 0.05–0.95. The agent composes the farmer-facing advice with a closing that matches the release state, and always sets `RequiresApproval = true`. With neither finding, it issues a generic safe advisory at 0.2 confidence.

## 6.5 Shared features: accounts, approvals and administration

- **Registration.** Farmers and buyers self-register. NIC (12 digits, or 9 digits plus V/X), phone (10 digits) and district are validated and normalised, and the username is unique and checked live. Accounts start **Pending**. A farmer is approved by an officer of their district or by an admin, and a buyer by an admin. Rejections carry a reason and can be reversed.
- **Sign-in.** Email and password, with the password policy and lockout in §12. Admins use a separate endpoint and page.
- **Profiles.** Users edit their display name, photo and phone, and change their password (which issues a new token and invalidates the old ones). Changes to **full name, NIC or email** are identity changes: they create a `ProfileChangeRequest` for an officer or admin to approve, with at most one pending request per field.
- **Administration.** Admins create officer and buyer accounts, change roles (Officer and Buyer only), activate or deactivate accounts (which takes effect on the next request), reset passwords, edit profiles, manage departments, and read the audit log.

## 6.6 Third-party integrations (specification §11)

**Third-party services against the specification's requirements**

| Service | Business purpose and benefit | Routed through the API? Credentials | Failures, timeouts, rate limits | Data shared |
|---|---|---|---|---|
| **Open-Meteo** (weather) | Recent rainfall and temperature explain fungal and water-related problems. The Validation agent uses them to confirm or doubt a diagnosis | Yes: only the Weather agent calls it. No key is needed | 8 s timeout; HTTP errors including 429, timeouts and bad JSON become a recorded fallback; tested | Only a district centroid (latitude and longitude); nothing about the farmer |
| **Cloudinary** (photo storage) | Durable storage for issue and profile photos outside the free App Service's disk | Yes: uploads are signed server-side, and issue photos are served only through the API. The key and secret are in App Service settings | An upload failure returns an error to the user; 15 s timeout when the API fetches a photo back | The re-encoded photo without metadata, stored under a random GUID |
| **Qwen 3.8 27B via LM Studio and ngrok** (language model) | Better plans for unusual wording, for example a monsoon mentioned without the word "rain" | Yes: only the Planner calls it. A shared key is kept in App Service settings and on the laptop, never in Git | 20 s per attempt, one retry, then rules; the tunnel allows only `POST /v1/chat/completions` with the key, at most 30 requests a minute | Crop, district, severity, the report text and any photo diagnosis. No names, phone numbers or accounts |

## 6.7 Photo diagnosis pipeline

The photo models were trained by the team (`ml/`, PyTorch and timm). Each is an **EfficientNet-B0** fine-tuned at 384 × 384 px for 12 epochs on an RTX 5090 laptop GPU.

1. **Data.** PlantVillage (lab photos) and PlantDoc (field photos) for Tomato and Potato, and the Cassava Leaf Disease Classification dataset (field photos from Uganda). Duplicates were removed, and the data was split 80/10/10 by class with a fixed seed.
2. **Calibration and thresholds.** Confidence is calibrated with temperature scaling. An auto-release threshold is chosen **per class** as the lowest confidence at which the class's validation precision stays at or above 95 % at a Wilson lower bound. A class that cannot prove this gets no threshold, so its cases always go to an officer.
3. **Export and parity.** The models are exported to ONNX. Each model's metadata records the preprocessing, classes, thresholds, metrics and the training commit. Backend tests check that C# preprocessing and inference match Python (the largest export difference is under 3 × 10⁻⁶). On 40 real photos per crop, the .NET predictions matched Python for Tomato 40/40 and Potato 40/40, with a largest probability difference under 10⁻⁶ (PR #49).
4. **Serving.** `OnnxImageClassifier` loads the models once and classifies with a timeout. The classifier runs only for crops that have a model.

**Photo model results on the untouched test split**

| Crop | Classes | Accuracy | Macro F1 | Notes |
|---|---|---|---|---|
| Tomato | 10 | 0.98 | 0.97 | Lab photos 0.997; **field photos (PlantDoc, 66 images) only 0.50**, so no class earned an auto-release threshold |
| Potato | 3 | 0.97 | 0.97 | Lab photos 1.00; **field photos 0.70 (23 images)**; no auto-release thresholds |
| Cassava | 5 | 0.87 | 0.77 | Field photos throughout; 2 of 5 classes earned a threshold |

These results show that lab accuracy does not carry over to real field photos. This is why automatic release is **switched off** in production (`AutoReleaseEnabled = false`): every photo diagnosis goes to an officer with its escalation reasons.

## 6.8 Error handling, validation and logging

- **Validation** returns 400 with field messages, from data annotations and the `[ApiController]` automatic model-state response. Business-rule failures return 400 or 409 with a `message` the clients display unchanged.
- **Global error handling.** `AddProblemDetails` and `UseExceptionHandler` turn any unhandled exception into an `application/problem+json` 500 without a stack trace. Database errors that users can trigger are translated. Unique violations on usernames, emails and department names become 409, and concurrency conflicts become 409 with a "refresh and try again" message.
- **Logging.** ASP.NET Core `ILogger` with message templates (for example `"{AgentName} step failed"`), so values are logged as fields. Agent failures, weather fallbacks and the Planner's model choice are logged, and none of them logs personal data or secrets. On Azure the logs are available in the App Service log stream.
- **Health.** `GET /health` runs a database check and returns `Healthy` or `Unhealthy`.

## 6.9 Challenges and how they were solved

**Main technical challenges met by the team**

| Challenge | Resolution |
|---|---|
| Two buyers accepting the last stock at the same time could oversell a listing | PostgreSQL `xmin` row versions on listings, requests and orders, with a 409 for the loser. In the stress test, 5 parallel acceptances against one listing produced exactly one sale and four clean 409s (§9.3) |
| Photo models near-perfect on lab photos but weak on field photos | Measured separately on field photos, then used statistically bounded per-class thresholds, with auto-release off and an officer always in the loop (§6.7) |
| Keeping agent output safe when a local LLM plans | Strict JSON schema, a deterministic parser with an allow-list, business-rule guardrails, prompt-injection isolation, timeouts with one retry, and rules as a fallback (§3.4) |
| Qwen 3.8 produced only "thinking" tokens and ran out of its token budget | Turned thinking off (`reasoning_effort: none`); answers now arrive in 2–6 s, and no hidden reasoning is stored |
| A deactivated user or changed password did not end existing sessions (JWTs last 8 hours) | A per-request check of the account's status and a `stamp` claim tied to Identity's security stamp |
| .NET's `\d` matched Sinhala and Tamil digits, and `$` allowed a trailing newline in NIC and phone numbers | Rules rewritten with `[0-9]` and `\z`, with tests |
| CI's PostgreSQL 16 reports a blocked delete as SQLSTATE 23503, while local PostgreSQL 18 reports 23001 | The integration test accepts either code |
| Free hosting: F1 cold starts, no always-on, the database in another region | Documented cold start; health URL to warm up; §9 measures the effect |

## 6.10 Known limitations and future work

- **Business logic in controllers.** Several large controllers query the DbContext directly (§3.2). Moving their rules into application services would make them easier to test without HTTP concerns.
- **No API rate limiting.** Sign-in is protected by account lockout, and the LLM tunnel is rate limited, but the API itself has no rate limiter. ASP.NET Core's built-in rate-limiting middleware is the next step.
- **Web token in `localStorage`.** The React app keeps the JWT in `localStorage` so sessions survive a reload. React escapes output, and no HTML is rendered from user input, but an HttpOnly cookie would remove the XSS exposure entirely.
- **Notifications by polling.** The mobile app polls every 60 seconds while it is open. Firebase Cloud Messaging would add push notifications, and the code has a documented hook for it.
- **Open minor items** from the pre-launch review:
  - buyers cannot withdraw a pending request
  - listings are not capped at the crop's expected yield
  - "units" wording on some web marketplace labels
  - identical crop names in pickers
  - the mobile keyboard can reappear after a picker closes
- **Photo models** need Sri Lankan field photos, and Paddy has no model yet.
