# Project overview and requirements

> Part of the AgriLink Sri Lanka project documentation ([index](README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 1. Project overview and scope

## 1.1 The business problem

Sri Lankan smallholder farmers depend on government agricultural extension officers for advice on crop diseases, pests and nutrient problems, but an officer covers many farmers across a district. A farmer who notices yellowing leaves or lesions usually has to travel, phone, or wait for a field visit. Advice arrives late, is rarely written down, and the officer has little context: which crop, which variety, when it was planted, what was applied and what the weather has been. Selling the harvest is the second problem. Farmers usually sell to collectors at the farm gate, with little visibility of what buyers across the country would pay.

## 1.2 The solution: AgriLink Sri Lanka

AgriLink connects the three groups involved in one system that works in **English, Sinhala and Tamil**:

- **Farmers** keep structured records of their farms, fields and crops, and report a crop problem from their phone with a description, a severity and a photo.
- A controlled **Agentic AI workflow** analyses each report straight away. It plans which analyses are needed, identifies the disease from the photo where a model exists, matches symptoms against a crop knowledge base, adds the district's recent weather, and validates everything against business rules. The result is an advisory **draft**.
- **Agricultural officers** review the draft in the web application. They see the photo, the full agent trace and the reasons for any escalation, then approve it, reject it, or replace the treatment with their own. Nothing reaches the farmer as final advice until an officer has signed it off.
- **Buyers** browse harvest listings from across the country and send purchase requests. When a farmer accepts one, it becomes an order.
- **Administrators** manage users, officer accounts, departments and the audit log, and see platform analytics.

## 1.3 Objectives

- Provide role-specific digital workflows for farmers, agricultural officers, buyers and administrators.
- Support structured management of farms, fields and crops.
- Let farmers report crop issues with a description and an optional photo.
- Generate AI-assisted advisories through several recorded agent steps rather than one opaque operation.
- Add weather context and deterministic validation rules to every analysis.
- Provide photo-based disease classification for the supported crops.
- Keep an agricultural officer in the approval loop for every advisory.
- Provide a harvest marketplace with a purchase-request and order workflow.
- Provide secure authentication, authorisation, validation, audit logging and profile-security workflows.
- Provide a web client and a mobile client that use the same API but serve different purposes.

## 1.4 Scope

**What the submitted system covers**

| In scope | Out of scope (future work) |
|---|---|
| Four roles with self-registration and approval; officer accounts created by admins | Online payment. Orders record the agreed price, and payment happens between the parties |
| Farms, fields, crops and crop status; crop issues with photos | Delivery logistics and transport booking |
| Agentic AI advisory with officer approval, trace and audit | Push notifications through Firebase. The app polls for notifications while it is open |
| Photo disease diagnosis for Tomato, Potato and Cassava (ONNX) | Photo models for Paddy and other crops, and training on Sri Lankan field photos |
| Harvest marketplace, purchase requests, orders | iOS build (the Flutter code is portable, but only Android was built and tested) |
| Notifications, officer and admin dashboards, audit log | Integration with official Department of Agriculture systems |
| English, Sinhala and Tamil; light and dark themes | Offline mode for the mobile app |

## 1.5 Business components and ownership

Each of the four students owns one business component end to end (API, database, React, Flutter, tests) and one distinct agent (specification §3).

**Components, owners and their Agentic AI contribution**

| Component | Owner | Agent | Main API resources |
|---|---|---|---|
| A. Farm and Crop Management | Razni Ahamed M. R. | Planner agent and the orchestration (also Image Classification and Photo Triage) | `/api/farms`, `/api/farms/{id}/fields`, `/api/fields/{id}/crops`, `/api/crops` |
| B. Crop Issue Reporting and AI Advisory | Gayathri M. G. K. | Crop Analysis agent and its crop knowledge base | `/api/issues`, `/api/advisories` |
| C. Harvest Marketplace and Purchase Requests | Fernando C. P. H. A. C. | Weather agent (Open-Meteo tool) | `/api/harvests`, `/api/purchase-requests` |
| D. Orders, Notifications and Analytics | Jayaweera A.J.D. | Validation agent | `/api/orders`, `/api/notifications`, `/api/admin/metrics`, `/api/officer/metrics` |

Shared features were split between members as well: accounts and registration approval, profiles and profile-change requests, the admin area, departments and the audit log. The mobile app was built in four phases with one owner each: Foundation (Razni), Farmer (Gayathri), Marketplace and orders (Jayaweera), and Officer and admin (Fernando). The Individual Reports in Part B give each member's evidence.

## 1.6 Different purposes for the web and mobile applications

Both clients use the same API, accounts, permissions and business rules, but they are designed for different work (specification §4.1):

- **React web application: review, administration and monitoring.** Officers work through the review queue on a large screen: photo, agent trace, escalation reasons, approve, reject or revise. Admins manage users, officer accounts, departments and the audit log, and read the analytics dashboard. The public home page and marketplace are also on the web.
- **Flutter mobile application: work in the field.** Farmers record farms and crops, report a problem with the phone camera, follow the advisory and receive notifications. Buyers browse and request produce. Officers and admins get the same review and approval screens on the move.

The cross-platform workflow in §3.5 uses this split. A farmer reports an issue on the phone, an officer approves it on the web, and the farmer's phone shows the result.

# 2. Requirements and user roles

## 2.1 Roles and permissions

**The four roles and what each may do (enforced by the API; the clients only hide what a role cannot use)**

| Role | Responsibilities and permissions | Restrictions |
|---|---|---|
| Visitor (no account) | Home page, browse and filter the marketplace, register as a farmer or buyer | Cannot see contact details, create requests or see any private data |
| Farmer | Own farms, fields and crops; report crop issues with photos; see own advisories; list harvests; accept or decline purchase requests; complete or cancel own orders | Only their own records (checked against the farmer profile on every request). Cannot see advisories until an officer has reviewed them, except preliminary photo advice when that is enabled |
| Buyer | Browse listings; send purchase requests; follow and complete or cancel own orders | Only their own requests and orders; cannot list produce |
| Agricultural officer | District dashboard; pending and reviewed issues of their district; approve, reject or revise AI advisories; approve farmer registrations and profile changes in their district | Scoped to their own district; created only by an administrator; cannot manage users or departments |
| Administrator | All users (create officers and buyers, change role, activate or deactivate, reset password, edit profile); departments; all issues; registrations; audit log; platform metrics; send a notification to a user | Separate sign-in page; only Officer and Buyer roles can be changed, so the administrator account cannot be demoted; changes are audit-logged |

## 2.2 Functional requirements

**Main functional requirements by component (all implemented)**

| ID | Component | Requirement |
|---|---|---|
| FR-01 | Accounts | Farmers and buyers register with NIC, phone and district; the account is Pending until approved or rejected with a reason |
| FR-02 | Accounts | Sign-in with email and password returns a JWT; five failed attempts lock the account for 15 minutes |
| FR-03 | Accounts | Users edit their profile and photo, change their password and phone number; changes to name, NIC or email need an officer's or admin's approval |
| FR-04 | A | Farmers create, edit and delete farms and fields; a field cannot be larger than its farm, and a farm cannot shrink below one of its fields |
| FR-05 | A | Farmers plant crops in a field (type from a fixed list, variety, planting and expected harvest dates, expected quantity) and move them through Seeded, Growing and Harvested |
| FR-06 | B | Farmers report an issue on a crop with title, description, severity and an optional photo (up to 5 MB; the API decodes it, turns it upright, strips its metadata and stores it as a JPEG) |
| FR-07 | B | Every report starts the agent workflow, which produces an advisory draft with risk level, recommendation, confidence and a full trace |
| FR-08 | B | Officers see their district's pending issues (review order: issues with no advice yet first, oldest first; also search and sort by date or severity), approve, reject, or reject with their own treatment, and add a note |
| FR-09 | B | Farmers see the decision, the approved advice and the officer's note, and are notified |
| FR-10 | C | Farmers list a harvest from one of their crops with quantity, price per unit, harvest date and collection point |
| FR-11 | C | Anyone browses active listings with search, crop and district filters, a price range and five sort orders |
| FR-12 | C | Buyers send purchase requests; farmers accept (reserving stock at the agreed price) or decline; the listing sells out automatically |
| FR-13 | D | An accepted request becomes an order with both parties' contact details; either party can complete or cancel it, and cancelling returns the stock |
| FR-14 | D | Users receive notifications for approvals, advisories, requests and orders; unread counts are shown on the bell |
| FR-15 | D | Admins see platform metrics and charts; officers see district metrics |
| FR-16 | Admin | Admins create officer accounts, manage roles, status, departments, and read the paged, filterable audit log |

## 2.3 Non-functional requirements

**Non-functional requirements and how they are met**

| Quality | How it is met |
|---|---|
| Security | JWT with issuer, audience, lifetime and signature validation; role-based authorisation on every endpoint; password policy and lockout; per-request session revocation; secrets only in configuration; details in §12 |
| Reliability | Transactions for multi-step writes; optimistic concurrency (PostgreSQL `xmin`) on listings, requests and orders; every agent and third-party failure degrades to a recorded safe result |
| Performance | Paged lists computed in the database, indexes on every foreign key and status column; local load tests at p95 under 70 ms for signed-in reads and logins (§9) |
| Usability | Three languages, light and dark themes, responsive layouts from 320 px phones to desktops, loading, empty, success and error states on every screen |
| Maintainability | Feature folders in all three code bases, typed DTOs and models, automated tests on every layer, CI on every pull request |
| Availability | Health endpoint with a database check; free cloud tiers with a documented cold start |
| Privacy | Only coordinates go to the weather service; the language model receives no names, phone numbers or accounts; photos are stored as authenticated assets with EXIF removed |

## 2.4 Minimum domain complexity (specification §4.1)

**How AgriLink meets the minimum domain complexity**

| Requirement | Evidence |
|---|---|
| At least three roles | Four roles: Farmer, Buyer, Agricultural officer, Administrator (plus visitors) |
| Four business components | A to D in §1.5, each with 4 to 11 endpoints and business operations beyond CRUD |
| CRUD and status workflows | Registrations (Pending → Approved/Rejected), issues and advisories, listings, purchase requests and orders (state diagrams in §4.6), crops, profile-change requests |
| Search, filtering, sorting | Marketplace (search, crop, district, price range, 5 sort orders), all issues (search, status, sort), pending issues (search, sort), admin users (search, role, status, sort), audit log (entity filter), mobile order status tabs |
| Pagination | Issues (pending, reviewed, all), notifications, audit log, change requests, admin users |
| Reporting and analytics | Admin dashboard (users, farms, crops, issues reported, pending and resolved, harvest volume sold this month, with charts); officer dashboard (pending in the district, reviewed today and in total, approved, rejected) |
| Different purposes for React and Flutter | §1.6 |
| Third-party integration | Open-Meteo (weather tool), Cloudinary (photo storage), and the Qwen language model through ngrok (§6.6) |
| Cross-platform agentic workflow | Flutter farmer → API → PostgreSQL → agents → React officer approval → Flutter farmer notified (§3.5, verified in §7.7) |
