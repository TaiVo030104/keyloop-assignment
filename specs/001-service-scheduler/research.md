# Phase 0 Research: Unified Service Scheduler (Frontend)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-02

Scope reminder: only the frontend is implemented. The backend is mocked at the network layer
behind an OpenAPI contract (Constitution I, IV). Every decision below resolves a
"NEEDS CLARIFICATION" item from the Technical Context or justifies a dependency (Constitution VII).

---

## R1. UI framework and build tool

- **Decision**: React 19 + TypeScript 5 (strict) + Vite 6, single-page application.
- **Rationale**: React has the largest ecosystem for accessible primitives and testing (RTL);
  Vite gives instant dev server and a static build that can be hosted anywhere (no server
  needed because the backend is mocked). TypeScript strict is mandated by the constitution.
- **Alternatives considered**: Next.js (SSR/route handlers unnecessary for a mocked backend and
  would blur the "frontend only" boundary); Angular (heavier, slower to iterate); SvelteKit
  (smaller ecosystem for a11y component kits and MSW examples).

## R2. Routing

- **Decision**: React Router 7 (library/data mode), two routes: `/book` and `/schedule`
  (query params `dealershipId`, `date` so a schedule view is linkable).
- **Rationale**: Mature, small API surface; URL-driven state makes the schedule view shareable
  and testable.
- **Alternatives considered**: TanStack Router (excellent typing but more setup for 2 routes);
  no router (loses deep links and back-button behaviour).

## R3. Server state, caching and retries

- **Decision**: TanStack Query v5 for all reads and mutations.
- **Rationale**: Provides loading/error/empty states, retry, cache invalidation (schedule list is
  invalidated after book/cancel) and request de-duplication out of the box — directly serves
  FR-018 and SC-002. Availability checks use a query keyed by
  `{dealershipId, serviceTypeId, start}` so identical checks are cached for a few seconds.
- **Alternatives considered**: Redux Toolkit Query (more boilerplate, global store not needed);
  hand-written `useEffect` fetching (re-implements retry/caching, error-prone).

## R4. API contract and typed client

- **Decision**: OpenAPI 3.1 at `contracts/openapi.yaml` (repo root, copy of
  [contracts/openapi.yaml](./contracts/openapi.yaml)); types generated with `openapi-typescript`
  into `src/api/schema.gen.ts`; requests made with `openapi-fetch` (≈6 kB, fully typed from the
  generated paths). A CI step regenerates types and fails on diff.
- **Rationale**: Satisfies Constitution I (no hand-written API shapes) and is the API deliverable
  for the assessment. `openapi-fetch` middleware is the single place to attach correlation ids
  and emit logs (Constitution VI).
- **Alternatives considered**: Orval / openapi-generator (generate a lot of code and hooks we would
  not own); hand-written fetch + zod (duplicates the contract).

## R5. Mock backend technique

- **Decision**: Mock Service Worker (MSW) v2. Browser: service worker intercepts `fetch` to
  `/api/*`. Tests (Vitest/Node): `setupServer` with the **same** handlers.
- **Rationale**: Intercepts at the network layer, so application code is identical to production
  (Constitution IV). Handlers are thin: parse request → call `src/domain` → read/write store →
  shape response per contract.
- **Alternatives considered**: json-server (separate process, cannot run domain logic or simulate
  409 idempotency semantics without custom middleware); Mirage JS (less active, patches
  XHR/fetch instead of the network layer); static JSON (no persistence, no conflicts).

## R6. Mock persistence

- **Decision**: A `SchedulerStore` repository interface with two implementations:
  `LocalStorageStore` (browser, key `kss:db:v1`, JSON with `schemaVersion`) and `MemoryStore`
  (tests). Seed is applied when the key is absent or the schema version differs; a
  "Reset demo data" action re-seeds.
- **Rationale**: Data set is tiny (< 1 MB), so localStorage is enough and is synchronous, which
  makes the read-validate-write critical section simple. It is shared across tabs of the same
  origin, which is exactly what is needed to demonstrate US3 (two advisors = two tabs).
- **Alternatives considered**: IndexedDB (async, more code, no benefit at this size);
  sessionStorage (not shared across tabs, lost on close — violates FR-013).

## R7. Preventing double-booking across tabs (US3, FR-011, FR-014)

- **Decision**: The `POST /appointments` handler runs its re-validate-and-write inside a mutex
  obtained via the Web Locks API (`navigator.locks.request('kss-booking', …)`), with an
  in-process promise-queue fallback when Web Locks are unavailable (Node tests). Inside the lock
  it re-reads the store, re-runs `checkAvailability` for the exact proposed technician and bay,
  and only then writes. Idempotency: the client generates a UUID `Idempotency-Key` when the
  review dialog opens; the store keeps `key → {requestHash, appointmentId}`. Same key + same
  body → replay the original 201; same key + different body → 422.
- **Rationale**: Mirrors what a real backend does (transaction + unique constraint/row lock) and
  makes the conflict path deterministic and testable. Web Locks are cross-tab on the same origin.
- **Alternatives considered**: Optimistic version number on the store (works, but still needs
  atomic compare-and-swap that localStorage lacks); BroadcastChannel leader election
  (more complex for the same guarantee).

## R8. Confirmation semantics when proposed resources are taken

- **Decision**: The confirm request carries the proposed `technicianId` and `bayId` the advisor
  reviewed. If either is no longer free for the window, the API returns **409** with a fresh
  `reason` and `alternatives`. The requested time may itself appear in `alternatives` (with
  different resources) — the UI then shows it first as "Same time, different technician/bay".
- **Rationale**: The advisor never confirms something different from what they reviewed
  (no silent reassignment), satisfying FR-009/FR-011 and US3 scenario 1.
- **Alternatives considered**: Server silently reassigns to another free resource (surprising,
  breaks the review step); reject without alternatives (violates US3).

## R9. Alternative-slot search (FR-008, SC-005)

- **Decision**: Candidate starts are every 15 minutes from `max(now rounded up to 15 min,
  start of requested day's opening)` up to 7 days after the requested start, only on open days
  and only where `[start, start + duration)` fits inside opening hours. Each candidate is
  evaluated with the same `findAssignment` used for the main check. Candidates are ranked by
  absolute distance from the requested start (ties → earlier first) and the first 5 are
  returned. Empty result → `alternatives: []` with `reason` and UI message "No availability in
  the next 7 days".
- **Rationale**: "Nearest" naturally includes earlier slots on the same day. Worst case
  ≈ 7 days × 40 slots × (≤ 10 technicians + ≤ 10 bays) ≈ 5.6k overlap checks — well under 10 ms,
  keeping SC-002 (< 1 s p95) even with simulated latency.
- **Alternatives considered**: Forward-only search (misses an earlier free slot the customer may
  prefer); interval-tree free-slot computation (faster but unnecessary at this scale).

## R10. Resource assignment (FR-010)

- **Decision**: Among qualified, free technicians choose the one with the fewest **confirmed**
  appointments on that local day; tie → name ascending, then id. Same rule independently for
  bays.
- **Rationale**: Deterministic (testable) and balances workload as the spec requires.

## R11. Time and time zones (FR-003, FR-017)

- **Decision**: All instants stored/exchanged as ISO-8601 UTC strings. Dealership has an IANA
  `timeZone`; opening hours are local wall-clock `HH:mm`. Conversion with `date-fns` v4 +
  `@date-fns/tz` (`TZDate`). Domain functions receive `now` as a parameter. UI date/time inputs
  are interpreted in the **dealership** zone, never the device zone. Seed data has two
  dealerships in different zones (`Europe/London`, `Asia/Ho_Chi_Minh`) to demonstrate this.
- **Rationale**: Avoids the classic "device tz ≠ business tz" bug; DST transitions are handled by
  the tz library rather than by hand.
- **Alternatives considered**: Luxon (larger); Temporal API (not yet available in all target
  browsers without a polyfill); native `Intl` only (formatting is fine but zoned arithmetic is
  error-prone).

## R12. Forms and validation

- **Decision**: React Hook Form + Zod resolver for the booking form; Zod schemas cover UI-only
  rules (required fields, 15-minute granularity). API shapes still come from generated types.
- **Rationale**: Uncontrolled inputs keep re-renders low; FR-001…FR-003 and US1 scenario 4
  ("explain what is missing") map directly onto field errors with `aria-describedby`.
- **Alternatives considered**: Formik (heavier, less maintained); plain `useState` (more code for
  field-level errors and focus management).

## R13. UI components and accessibility (Constitution VII, FR-020, SC-006)

- **Decision**: Tailwind CSS v4 + shadcn/ui components (copied source, built on Radix UI
  primitives) for Combobox (customer search), Select, Dialog/AlertDialog, Toast. Availability
  result region uses `role="status"` / `aria-live="polite"`; conflicts use `role="alert"`.
  Automated checks with `vitest-axe` (components) and `@axe-core/playwright` (pages).
- **Rationale**: Radix primitives ship correct keyboard and ARIA behaviour; owning the copied
  source avoids a heavy component-library dependency.
- **Alternatives considered**: MUI (large bundle, theming overhead); hand-rolled components
  (high a11y risk for combobox/dialog).

## R14. Observability (Constitution VI, FR-019)

- **Decision**:
  - `src/observability/logger.ts`: structured JSON events `{ts, level, event, traceId, …}` with a
    pluggable sink (console in dev, memory in tests, `navigator.sendBeacon` to a configurable URL
    in prod — off by default).
  - `openapi-fetch` middleware: generates W3C `traceparent` + `X-Correlation-Id` per request,
    logs `api.request` with operation, status, duration; mock handlers echo the id in responses
    and log with the same id, so a UI error can be traced end-to-end.
  - `telemetry.track()` business events: `availability.checked`, `booking.confirmed`,
    `booking.conflict`, `booking.cancelled`, `api.error`.
  - `web-vitals` (LCP, INP, CLS) → telemetry sink.
  - `react-error-boundary` at route level: logs the error, shows "Something went wrong" with
    *Try again* and the correlation id for support.
- **Rationale**: Gives logs, metrics (durations, counts, vitals) and trace correlation without a
  vendor. The sink seam lets OpenTelemetry Web / Sentry be added later without touching
  callers.
- **Alternatives considered**: Full OpenTelemetry JS SDK now (heavy; no collector in scope);
  Sentry SDK (external account required for reviewers).

## R15. Testing strategy (Constitution III)

- **Decision**:
  - **Unit** (Vitest): `src/domain/**` — TDD, coverage thresholds 90% lines/branches enforced in
    `vitest.config.ts` for that folder.
  - **Contract/handler** (Vitest + MSW node + `MemoryStore`): every endpoint's success and error
    responses validated against the OpenAPI schema (`openapi-response-validator` /
    Ajv on the bundled spec).
  - **Component/integration** (Vitest + RTL + user-event + MSW): booking form, alternatives
    selection, conflict recovery, schedule list, cancel dialog, error/retry states.
  - **E2E** (Playwright, Chromium): happy path, conflict path with two pages in one browser
    context (shared storage), keyboard-only booking, axe scan.
- **Rationale**: Pyramid keeps the business rules fastest and most thoroughly tested while still
  proving the real UX.
- **Alternatives considered**: Jest (slower ESM/Vite integration); Cypress (two-tab scenario is
  awkward; Playwright handles multiple pages natively).

## R16. Mock realism controls (Constitution IV)

- **Decision**: `src/mocks/chaos.ts` reads settings from localStorage / a small dev panel:
  latency (default 200–600 ms random), failure rate (default 0), and a "force next request to
  fail with 500" toggle. Validation errors (400/422), 404 and 409 come from real handler logic,
  not random injection.
- **Rationale**: Exercises loading and retry UI deliberately during the demo and in tests
  (tests set latency to 0).

## R17. Tooling, CI and delivery

- **Decision**: pnpm, ESLint (typescript-eslint strict + jsx-a11y + react-hooks), Prettier,
  GitHub Actions: `lint → typecheck → contract:check → test:coverage → build → e2e`. Deployed as
  a static site (GitHub Pages / Netlify) with MSW enabled via `VITE_ENABLE_MOCKS=true`.
- **Rationale**: Reviewers can open a URL and try it without running anything; CI enforces the
  constitution gates.

---

## Resolved clarifications summary

| Topic | Resolution |
|---|---|
| Framework / build | React 19 + Vite 6 + TS strict (R1) |
| Mock layer | MSW v2, same handlers in browser and tests (R5) |
| Persistence | localStorage repository, versioned, resettable (R6) |
| Concurrency / idempotency | Web Locks mutex + Idempotency-Key replay (R7) |
| Confirm with stale proposal | 409 + alternatives, no silent reassignment (R8) |
| "Nearest" alternatives | ±distance ranking, 15-min grid, 7-day horizon, max 5 (R9) |
| Time zones | UTC storage, dealership IANA zone for input/display (R11) |
| Observability | logger + telemetry + traceparent middleware + web-vitals + error boundary (R14) |
| Testing | Vitest unit/contract/component + Playwright e2e + axe (R15) |
