# Security considerations

> Part of the AgriLink Sri Lanka project documentation ([index](README.md)). Section numbers follow the team's SE3090 Assignment 1 report, so "§" references point to its sections.

# 12. Security considerations

## 12.1 Authentication and sessions

- **Passwords.** Hashed by ASP.NET Core Identity's `PasswordHasher`: PBKDF2 with HMAC-SHA512, a per-user salt and many iterations. Plain passwords are never stored or logged.
- **Password policy.** At least 12 characters, with upper case, lower case, a digit and a symbol. The React and Flutter forms show the same checklist while the user types.
- **Lockout.** Five failed sign-ins lock the account for 15 minutes, for new users too.
- **Registration approval.** Self-registered accounts cannot sign in until an officer or admin approves them, and rejected or deactivated accounts cannot sign in at all.
- **JWT.** Tokens are signed with HMAC-SHA256 using a key of 64+ random characters from configuration, and last 8 hours. The API validates the issuer, audience, lifetime (one minute of clock skew) and signature.
- **Session revocation.** On every request, `AccountSessionValidator` checks that the account still exists, is active and approved, and that the token's `stamp` claim matches Identity's security stamp. Deactivating a user, changing their role or changing the password therefore ends existing sessions immediately, not after 8 hours.
- **Re-authentication for sensitive changes.** The server checks the current password before a password change, a phone-number change or an identity change request is accepted. An officer or admin re-enters their own password to approve an identity change. Failed attempts are audit-logged (`SecurityReauthFailed`).
- **Token storage.** Mobile keeps the token in Android's encrypted storage (`flutter_secure_storage`). The web app keeps it in `localStorage` (see §12.3).

## 12.2 Authorisation

- **Role checks.** Every controller or action declares its roles (Appendix A lists all 80 operations). The clients' route guards only improve usability; the API decides.
- **Ownership checks.** A farmer's farms, fields, crops, issues and listings, and a buyer's requests and orders, are checked against the caller's profile, and others' records return 403.
- **District scope.** Officers see and decide only issues, farmer registrations and profile changes from their own district. Buyer registrations need an admin.
- **Privilege limits.** Admins can change only the Officer and Buyer roles, so the administrator account cannot be demoted. Admin actions go to the audit log.

## 12.3 Data protection and configuration

- **Secrets.** Stored only in App Service settings and .NET user-secrets, never in Git (§10.3). The repositories are public, so this was checked before submission. `appsettings.Development.json` is also excluded from every publish (`CopyToPublishDirectory="Never"`), so it can never reach a server. The mobile signing key and the language-model key are kept outside the repositories.
- **Transport.** HTTPS only (HTTP redirects with 301), TLS 1.2 at minimum, and TLS required to the database.
- **CORS.** Production allows only the website's origin.
- **Input validation.** Every DTO has length and format limits, and search strings are limited to 100 characters. Sort orders come from fixed lists, and districts and crop types from fixed lists. EF Core parameterises every query, so there is no SQL built from user text.
- **File uploads.** 5 MB request limit. Every image is decoded and re-encoded server-side (whatever file type is claimed), and EXIF including GPS is removed. Issue photos are stored as authenticated Cloudinary assets under random names and served only through an authorised API call.
- **Output encoding.** React escapes all rendered text and no user HTML is rendered, and Flutter renders text only. Swagger and ProblemDetails responses never include stack traces in production.
- **Personal data minimisation.** The weather service receives only coordinates. The language model receives no names, phone numbers or accounts. Logs contain identifiers and messages, not personal data or secrets.
- **Known gap: token in `localStorage`.** It keeps web sessions across reloads, but a successful XSS attack could read it. Mitigations are React's escaping, no use of `dangerouslySetInnerHTML` anywhere in the app, and 8-hour tokens with server-side revocation. An HttpOnly, SameSite cookie is the planned improvement.

## 12.4 Agentic AI security

**Agentic AI threats and controls**

| Threat | Control |
|---|---|
| Prompt injection in a farmer's report | The report is serialised as escaped JSON data inside `<report>` tags under a system prompt that marks it untrusted. The model can only choose between two read-only agents. A deterministic parser and guardrails check the plan. The officer's approval is always required. Golden and live tests include an injection case (§8.3, §8.5) |
| Unsafe or malformed model output | Strict JSON schema; the parser rejects unknown agents, duplicates and missing reasons; lengths are clipped; rules take over on any rejection |
| Excessive agency | No agent writes data or triggers the high-impact action. `RequiresApproval` is forced to true, and only an authorised officer or admin can approve |
| Tool misuse and SSRF | The weather URL is built from coordinates in a code allow-list, and unknown districts never reach the network. Each agent has access only to its own tool |
| Denial of service and cost | Timeouts on every external call (weather 8 s, model 20 s, ONNX 10 s); one retry at most; the tunnel is rate limited to 30 requests a minute and rejects requests without the key |
| Secret leakage | The language-model key and the Cloudinary credentials are only in configuration, and the model is never given any secret |
| Hidden reasoning or sensitive data in stored state | Thinking is switched off; the trace stores only structured inputs and outputs and short stated reasons |

## 12.5 Residual risks and next steps

1. **API rate limiting.** Add ASP.NET Core's rate limiter, especially for sign-in and registration.
2. **Web session storage.** Move the web session to an HttpOnly cookie, with CSRF protection.
3. **Database privileges.** Use a least-privilege database role for the API. Migrations would run from a deploy step with an owner role.
4. **Dependency scanning.** Add Dependabot and `dotnet list package --vulnerable` to CI.
5. **Model hosting.** Replace the laptop tunnel with a managed GPU host for any real deployment.
