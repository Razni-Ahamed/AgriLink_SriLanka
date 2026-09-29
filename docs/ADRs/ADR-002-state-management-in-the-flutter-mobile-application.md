# ADR-002: State management in the Flutter mobile application

**Status:** Accepted (2026-09-24), defined in Phase 1 (mobile PR #2) and used by all four phases.

**Context.** The mobile app covers all four roles and is written by four people in parallel, one feature folder each. Data must be cleared the moment a user signs out, and pages need loading, error and refresh states. Tests must be able to replace the API, the storage and the device permissions.

**ADR-002 options**

| Option | For | Against |
|---|---|---|
| Provider + ChangeNotifier | Simple and familiar | Manual disposal and wiring; weak compile-time safety; awkward async states |
| Bloc/Cubit | Strict, event-driven, very testable | A lot of boilerplate for mostly "load and show" screens; slower for four parallel developers |
| GetX | Little code | Global service locator, hidden magic, hard to test; widely discouraged for maintainable apps |
| **Riverpod 3** | Compile-safe providers, `AsyncValue` for loading, error and data, automatic disposal, `family` for IDs, easy overrides in tests | Newer API; provider types must be chosen correctly |

**Decision.** Use **Riverpod 3**: `Provider` for API objects, `FutureProvider.autoDispose`/`.family` for loaded data, and `Notifier`/`AsyncNotifier` for state that screens change. Every user-data provider watches `sessionTokenProvider`. Navigation uses **go_router** with a role shell and redirect guards that read the session.

**Consequences.**

- (+) Signing out invalidates every user's data in one step.
- (+) `AsyncValue` gives every screen the same loading, error and empty handling through shared widgets.
- (+) Tests override the API, storage and permissions (`pumpAgriLink`), which is how the 515 tests run without a server.
- (−) Team members new to Riverpod needed the architecture guide (`docs/ARCHITECTURE.md` §3) and review of their first providers.
