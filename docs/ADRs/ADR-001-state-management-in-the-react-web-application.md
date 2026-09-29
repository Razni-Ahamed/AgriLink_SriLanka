# ADR-001: State management in the React web application

**Status:** Accepted (2026-08-22), used in every feature since PR #19.

**Context.** Almost all of the web app's data lives on the server: farms, issues, advisories, listings, orders, users. The same data appears on several pages. Queues change when an officer decides, and orders change when the other party acts. The client itself holds little state: the session (token, role, user), the theme and language, and open dialogs. Four students would build features in parallel, so the pattern had to be simple to follow.

**ADR-001 options**

| Option | For | Against |
|---|---|---|
| Redux Toolkit (+ RTK Query) | One well-known store; RTK Query caches server data | More ceremony (slices, actions, store setup) for little client state; everyone must learn the whole pattern |
| Context API + `useEffect` fetching | No dependencies | Hand-written loading, error, caching and invalidation on every page; re-render problems as contexts grow |
| **TanStack Query + Zustand** | Query handles caching, deduplication, refetching and invalidation of server data; Zustand is a tiny hook-based store for the session and preferences | Two libraries to learn, each small |

**Decision.** Use **TanStack Query** for all server state, through one hook per API call in each feature's `hooks/` folder. After a change, a mutation invalidates the affected queries. Use **Zustand** for client state: `authStore` (persisted session), `useUiStore` and `useLanguageStore`. Forms keep their own state with React Hook Form and Zod.

**Consequences.**

- (+) Loading and error states come from the query hooks, which made consistent UI states straightforward.
- (+) After an approval, invalidating `issues` and `advisory` refreshes every affected page.
- (+) The session store is tiny and testable (`useUiStore.test.ts`, route-guard tests).
- (−) Developers must choose the right cache keys, and a missed invalidation shows stale data until the next refetch.
- (−) The token is persisted in `localStorage` (§12.3).
