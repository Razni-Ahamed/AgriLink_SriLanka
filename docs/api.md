# REST API

> Part of the AgriLink Sri Lanka project documentation ([index](README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

Live Swagger UI: https://agrilink-api-sl.azurewebsites.net/swagger (use **Authorize** with a token from `POST /api/auth/login`).

# Design conventions

**API conventions**

| Aspect | Convention |
|---|---|
| Resources | Plural nouns and nesting for ownership: `/api/farms/{farmId}/fields`, `/api/fields/{fieldId}/crops`. Actions that are not CRUD are sub-resources: `/approve`, `/reject`, `/respond`, `/complete`, `/cancel`, `/read-all` |
| Methods | `GET` reads, `POST` creates or performs an action, `PUT` updates, `DELETE` removes |
| Status codes | 200 OK, 201 Created (with the new resource), 204 No Content, 400 validation or business rule, 401 not signed in, 403 wrong role, or a record that belongs to someone else, 404 not found, 409 conflict (duplicate, concurrency, invalid state), 413 file too large, 500 as `application/problem+json` without internal details |
| Validation | Data annotations on DTOs (`[Required]`, `[StringLength]`, `[Range]`, `[EmailAddress]`, regular expressions for NIC and phone), then business rules in the controller or service, with messages the clients display |
| Paging | `?page=&pageSize=` (maximum 100), returning `PagedResponse<T>` with `items`, `page`, `pageSize`, `totalCount`, `totalPages` |
| Search and sort | `?search=` (trimmed, 100 characters maximum), plus `?sort=` from a fixed list; unknown values return 400 |
| Documentation | Swagger/OpenAPI with a JWT **Authorize** button; enums shown as strings |

**Endpoints per component (full list with roles in Appendix A)**

| Component | Endpoints | Business operations beyond CRUD |
|---|---|---|
| A. Farms and crops | 14 (+2 lookups) | Area rules between farms and fields; crop status lifecycle; delete protection for crops with history; the farmer's crops across farms |
| B. Issues and advisories | 10 | Starting the agent workflow; photo upload and processing; district-scoped review queue; approve, reject, or reject with the officer's treatment; officer photo-diagnosis correction |
| C. Marketplace | 9 | Server-side search, price filter and sort; accept or decline with stock reservation and concurrency checks; automatic sold-out |
| D. Orders, notifications, analytics | 11 | Complete or cancel an order with stock return; unread counts and mark-all-read; admin and officer metrics |
| Shared: accounts and administration | 34 | Registration approval, profile-change approval, lockout, session revocation, admin user management, departments, audit log |

# Endpoints and roles

All routes are served by the ASP.NET Core API at `https://agrilink-api-sl.azurewebsites.net`. The live Swagger UI documents every request and response model. "Signed in" means any authenticated, approved and active account. Officers only see and act on data from their own district.

**The 80 API operations, their controller action and who may call them**

| Controller | Verb | Route | Action | Allowed |
|---|---|---|---|---|
| Admin | POST | `/api/admin/users` | CreateUser | Admin |
| Admin | GET | `/api/admin/roles` | GetRoles | Admin |
| Admin | GET | `/api/admin/users` | GetUsers | Admin |
| Admin | PUT | `/api/admin/users/{userId:int}/role` | UpdateUserRole | Admin |
| Admin | PUT | `/api/admin/users/{userId:int}/status` | UpdateUserStatus | Admin |
| Admin | POST | `/api/admin/users/{userId:int}/password` | ResetPassword | Admin |
| Admin | PUT | `/api/admin/users/{userId:int}/profile` | UpdateUserProfile | Admin |
| Admin | GET | `/api/admin/audit-logs` | GetAuditLogs | Admin |
| Admin | GET | `/api/admin/metrics` | Metrics | Admin |
| Advisories | GET | `/api/advisories/{id:int}` | GetById | Signed in |
| Advisories | POST | `/api/advisories/{id:int}/approve` | Approve | Officer, Admin |
| Advisories | POST | `/api/advisories/{id:int}/reject` | Reject | Officer, Admin |
| Auth | POST | `/api/auth/register` | Register | Public |
| Auth | POST | `/api/auth/login` | Login | Public |
| Auth | POST | `/api/auth/admin/login` | AdminLogin | Public |
| CropTypes | GET | `/api/crop-types` | GetAll | Public |
| Crops | POST | `/api/fields/{fieldId:int}/crops` | PlantCrop | Farmer, Admin |
| Crops | GET | `/api/crops/{cropId:int}` | GetCrop | Farmer, Admin |
| Crops | PUT | `/api/crops/{cropId:int}` | UpdateCrop | Farmer, Admin |
| Crops | DELETE | `/api/crops/{cropId:int}` | DeleteCrop | Farmer, Admin |
| Crops | GET | `/api/fields/{fieldId:int}/crops` | GetFieldCrops | Farmer, Admin |
| Crops | GET | `/api/crops/mine` | MyCrops | Farmer |
| Departments | GET | `/api/admin/departments` | GetAll | Admin |
| Departments | POST | `/api/admin/departments` | Create | Admin |
| Departments | PUT | `/api/admin/departments/{id:int}` | Rename | Admin |
| Departments | DELETE | `/api/admin/departments/{id:int}` | Delete | Admin |
| Districts | GET | `/api/districts` | GetAll | Public |
| Farms | GET | `/api/farms` | GetFarms | Farmer, Admin |
| Farms | POST | `/api/farms` | CreateFarm | Farmer, Admin |
| Farms | PUT | `/api/farms/{farmId:int}` | UpdateFarm | Farmer, Admin |
| Farms | DELETE | `/api/farms/{farmId:int}` | DeleteFarm | Farmer, Admin |
| Farms | GET | `/api/farms/{farmId:int}/fields` | GetFields | Farmer, Admin |
| Farms | POST | `/api/farms/{farmId:int}/fields` | AddField | Farmer, Admin |
| Farms | PUT | `/api/farms/{farmId:int}/fields/{fieldId:int}` | UpdateField | Farmer, Admin |
| Farms | DELETE | `/api/farms/{farmId:int}/fields/{fieldId:int}` | DeleteField | Farmer, Admin |
| Harvests | GET | `/api/harvests` | GetAll | Public |
| Harvests | GET | `/api/harvests/mine` | Mine | Farmer |
| Harvests | GET | `/api/harvests/{id:int}` | GetById | Signed in |
| Harvests | POST | `/api/harvests` | Create | Farmer |
| Harvests | PUT | `/api/harvests/{id:int}` | Update | Farmer, Admin |
| Issues | POST | `/api/issues` | Create | Farmer |
| Issues | POST | `/api/issues/with-photo` | CreateWithPhoto | Farmer |
| Issues | GET | `/api/issues/mine` | Mine | Farmer |
| Issues | GET | `/api/issues/pending` | Pending | Officer, Admin |
| Issues | GET | `/api/issues/{issueId:int}/images/{imageId:int}` | GetImage | Signed in |
| Issues | GET | `/api/issues/reviewed` | Reviewed | Officer |
| Issues | GET | `/api/issues` | GetAll | Admin |
| Notifications | GET | `/api/notifications/mine` | Mine | Signed in |
| Notifications | GET | `/api/notifications/unread-count` | UnreadCount | Signed in |
| Notifications | PUT | `/api/notifications/read-all` | MarkAllRead | Signed in |
| Notifications | PUT | `/api/notifications/{id}/read` | MarkRead | Signed in |
| Notifications | POST | `/api/notifications/send` | Send | Admin |
| Officer | GET | `/api/officer/metrics` | Metrics | Officer |
| Orders | GET | `/api/orders/mine` | Mine | Buyer, Farmer |
| Orders | GET | `/api/orders/{id:int}` | GetById | Signed in |
| Orders | POST | `/api/orders/{id:int}/complete` | Complete | Buyer, Farmer |
| Orders | POST | `/api/orders/{id:int}/cancel` | Cancel | Buyer, Farmer |
| ProfileChangeRequests | GET | `/api/profile-change-requests/pending` | Pending | Officer, Admin |
| ProfileChangeRequests | POST | `/api/profile-change-requests/{id:int}/approve` | Approve | Officer, Admin |
| ProfileChangeRequests | POST | `/api/profile-change-requests/{id:int}/reject` | Reject | Officer, Admin |
| ProfilePhotos | GET | `/api/profile-photos/{fileName}` | Get | Public |
| PurchaseRequests | POST | `/api/purchase-requests` | Create | Buyer |
| PurchaseRequests | GET | `/api/purchase-requests/mine` | Mine | Farmer |
| PurchaseRequests | GET | `/api/purchase-requests/sent` | Sent | Buyer |
| PurchaseRequests | POST | `/api/purchase-requests/{id:int}/respond` | Respond | Farmer |
| Registrations | GET | `/api/registrations/pending` | Pending | Officer, Admin |
| Registrations | GET | `/api/registrations/rejected` | Rejected | Officer, Admin |
| Registrations | POST | `/api/registrations/{userId:int}/approve` | Approve | Officer, Admin |
| Registrations | POST | `/api/registrations/{userId:int}/reject` | Reject | Officer, Admin |
| Users | GET | `/api/users/username-available` | UsernameAvailable | Public |
| Users | GET | `/api/users/me` | Me | Signed in |
| Users | PUT | `/api/users/me/profile` | UpdateProfile | Signed in |
| Users | POST | `/api/users/me/photo` | UploadPhoto | Signed in |
| Users | DELETE | `/api/users/me/photo` | DeletePhoto | Signed in |
| Users | POST | `/api/users/me/password` | ChangePassword | Signed in |
| Users | GET | `/api/users/me/security` | Security | Signed in |
| Users | POST | `/api/users/me/verify-password` | VerifyPassword | Signed in |
| Users | PUT | `/api/users/me/phone` | UpdatePhone | Signed in |
| Users | POST | `/api/users/me/change-requests` | CreateChangeRequest | Signed in |
| Users | DELETE | `/api/users/me/change-requests/{id:int}` | WithdrawChangeRequest | Signed in |
