---

description: "Task list for 001-service-scheduler (Unified Service Scheduler, frontend + mocked backend)"
---

# Tasks: Unified Service Scheduler

**Input**: Design documents from `/specs/001-service-scheduler/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: REQUIRED. Constitution Principle III (NON-NEGOTIABLE) mandates test-first domain rules
(≥ 90% line/branch coverage on `src/domain/**`), component/integration tests for user flows, and
e2e tests for the booking happy path and the conflict path. Within every phase, test tasks come
before the implementation they cover and MUST fail first.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1–US4)

## Path Conventions

Single web-application project at the repository root (plan.md → Structure Decision):
`src/`, `tests/`, `contracts/`, `docs/`. Import direction `domain ← mocks ← api ← features`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Initialize Vite 6 + React 19 + TypeScript project at repo root: `package.json` (pnpm, `"type": "module"`, Node ≥ 22), `index.html`, `vite.config.ts`, `src/main.tsx`, `src/vite-env.d.ts`; `.gitignore` for `node_modules`, `dist`, `coverage`, `playwright-report`, `test-results`
- [X] T002 Configure TypeScript strict in `tsconfig.json` / `tsconfig.node.json` (`strict: true`, `noUncheckedIndexedAccess`, target ES2022, path alias `@/* → src/*`)
- [X] T003 Install runtime deps per research R1–R14: react, react-dom, react-router, @tanstack/react-query, openapi-fetch, msw, react-hook-form, zod, @hookform/resolvers, date-fns, @date-fns/tz, react-error-boundary, web-vitals, @radix-ui primitives (dialog, alert-dialog, select, popover, slot), clsx, tailwind-merge; dev deps: typescript, vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, openapi-typescript, @redocly/cli, vitest, @vitest/coverage-v8, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, vitest-axe, ajv, ajv-formats, yaml, @playwright/test, @axe-core/playwright, eslint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-import, prettier
- [X] T004 [P] Configure ESLint flat config in `eslint.config.js`: typescript-eslint strict, react-hooks, jsx-a11y; `@typescript-eslint/no-explicit-any: error` except `**/*.gen.ts`; `import/no-restricted-paths` so `src/domain` imports nothing app-specific (no react, msw, `@/api`, `@/mocks`, `@/features`) and `src/features` may not import `src/mocks`; plus `.prettierrc`
- [X] T005 [P] Configure Tailwind CSS 4 via `@tailwindcss/vite` and base styles with visible focus ring in `src/index.css`
- [X] T006 [P] Copy contract to `contracts/openapi.yaml` (runtime source of truth) and add scripts in `package.json`: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:coverage`, `e2e`, `contract:lint` (redocly), `contract:gen` (openapi-typescript → `src/api/schema.gen.ts`), `contract:check` (regenerate and `git diff --exit-code`)
- [X] T007 Generate `src/api/schema.gen.ts` via `pnpm contract:gen` and verify `Available.available` is typed `true` (not `"true"`)
- [X] T008 [P] Configure Vitest in `vitest.config.ts` (jsdom for `*.test.tsx`, node for domain/contract, setup file `tests/setup/vitest.setup.ts`, coverage v8 with thresholds 90% lines/branches for `src/domain/**`)
- [X] T009 [P] Configure Playwright in `playwright.config.ts` (Chromium, `webServer: pnpm build && pnpm preview`, baseURL, testDir `tests/e2e`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain core, mock backend skeleton, API client, observability and app shell needed
by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Domain core (test-first)

- [X] T010 [P] Define domain types in `src/domain/types.ts`: `Instant` (ISO UTC string), `TimeWindow {start,end}` (half-open), `Skill = GENERAL_MAINTENANCE | BRAKES | EV_SYSTEMS | DIAGNOSTICS | ALIGNMENT`, `BayType = GENERAL | EV | ALIGNMENT`, Dealership (`openingHours {open:"HH:mm", close:"HH:mm"}` with `open < close`, `openDays` ISO weekdays 1–7 non-empty, `serviceTypeIds`), ServiceType (`durationMinutes` > 0, multiple of 15), ServiceBay (`active` boolean), Technician (`skills` non-empty, `workingDays`), Customer, Vehicle, Appointment (`status CONFIRMED | CANCELLED`, `cancelledAt` ISO UTC | null), `SchedulingSnapshot`, `UnavailableReason` (incl. `PROPOSED_RESOURCE_TAKEN`), `AvailabilityResult` union
- [X] T011 [P] Write failing tests in `src/domain/time.test.ts`: `overlaps` (back-to-back 10:00–11:00 vs 11:00–12:00 → false; 1-minute overlap → true; containment → true; identical → true), `addMinutes`, `localDayBounds` / `zonedTimeToUtc` for `Europe/London` and `Asia/Ho_Chi_Minh` incl. DST change dates (2026-03-29, 2026-10-25), `isoWeekdayInZone`, `isAlignedTo15InZone`
- [X] T012 Implement `src/domain/time.ts` (date-fns + @date-fns/tz `TZDate`, no `Date.now`) until T011 passes
- [X] T013 [P] Write failing tests in `src/domain/rules.test.ts`: `isWithinOpeningHours` (start exactly at open → true, end exactly at close → true, start before open / end after close → false), `isOpenDay`, `isQualified` (missing skill, not working that weekday), `isBayCompatible` (wrong type, inactive), `isResourceFree` ignoring CANCELLED appointments and only matching the same technician/bay
- [X] T014 Implement `src/domain/rules.ts` until T013 passes

### Mock backend skeleton

- [X] T015 [P] Define `SchedulerStore` interface in `src/mocks/store/SchedulerStore.ts` (read snapshot, customers, appointments, idempotency records; `saveAppointment`, `updateAppointment`, `putIdempotency`, `reset(seed)`) and `src/mocks/store/memoryStore.ts`
- [X] T016 [P] Implement `src/mocks/store/localStorageStore.ts` (key `kss:db:v1`, JSON with `schemaVersion`; auto re-seed when key absent or version differs)
- [X] T017 [P] Implement deterministic synthetic seed in `src/mocks/seed.ts` per data-model "Seed data": 2 dealerships (London `Europe/London` 08:00–18:00 Mon–Sat; Saigon `Asia/Ho_Chi_Minh` 07:30–17:30 Mon–Sat), 5 service types (Oil change 60/GENERAL_MAINTENANCE/GENERAL, Brake service 90/BRAKES/GENERAL, EV battery check 120/EV_SYSTEMS/EV, Wheel alignment 45/ALIGNMENT/ALIGNMENT, Diagnostics 30/DIAGNOSTICS/GENERAL), 4 bays per dealership (one inactive GENERAL in London), 4 technicians per dealership with exactly one EV technician each, 10 customers with 1–2 vehicles (VIN 17 chars `[A-HJ-NPR-Z0-9]`), appointments relative to a given `today` incl. one CANCELLED
- [X] T018 [P] Implement `src/mocks/chaos.ts` (latency default 200–600 ms, failure rate default 0, "fail next request"; settings in localStorage key `kss:chaos`; tests force latency 0)
- [X] T019 [P] Implement problem+json helpers and response helpers in `src/mocks/http.ts` (`problem(status, title, detail, extra)`, echo `X-Correlation-Id`, `withChaos` wrapper, handler-side structured log)
- [X] T020 [P] Implement reference handlers `GET /api/dealerships` and `GET /api/dealerships/{dealershipId}/service-types` (404 unknown dealership) in `src/mocks/handlers/reference.ts`
- [X] T021 [P] Implement `GET /api/customers?q&limit` in `src/mocks/handlers/customers.ts` (case-insensitive on full name, phone digits or email; `q` min 2 chars else 400; limit 1–50 default 10)
- [X] T022 Wire handlers in `src/mocks/handlers/index.ts`, `src/mocks/browser.ts` (setupWorker) and `src/mocks/node.ts` (setupServer); a `src/mocks/runtime.ts` holding the active store and `now()` provider so tests can inject `MemoryStore` and a fixed clock; generate `public/mockServiceWorker.js` via `msw init`

### Observability & API client

- [X] T023 [P] Implement `src/observability/correlation.ts` (correlation id + W3C `traceparent` generation) and `src/observability/logger.ts` (structured `{ts, level, event, traceId, correlationId, …}` with swappable sinks: console, memory, beacon)
- [X] T024 [P] Implement `src/observability/telemetry.ts` (`track(event, props)`; events `availability.checked`, `booking.confirmed`, `booking.conflict`, `booking.cancelled`, `api.error`)
- [X] T025 Implement `src/api/client.ts` (openapi-fetch typed by `schema.gen.ts`, base `VITE_API_BASE_URL` default `/api`, middleware adding `X-Correlation-Id` + `traceparent`, logging `api.request` with operation/status/durationMs) and `src/api/errors.ts` (`ApiError`, `ConflictError` carrying `reason` + `alternatives`, mapping from Problem)
- [X] T026 [P] Write contract-test harness `tests/contract/validator.ts` (load `contracts/openapi.yaml` with `yaml`, compile response schemas with Ajv 2020 + formats) and `tests/setup/vitest.setup.ts` (jest-dom, vitest-axe matchers, MSW node server with MemoryStore, fixed `now`, chaos latency 0)
- [X] T027 [P] Write `tests/contract/reference.test.ts` and `tests/contract/customers.test.ts` validating 200/400/404 responses against the contract

### App shell

- [X] T028 Implement `src/lib/format.ts` (format instants in dealership zone: date, time, range; local date+time ↔ UTC instant helpers built on `src/domain/time.ts`)
- [X] T029 Implement `src/app/App.tsx` (QueryClientProvider, RouterProvider), `src/app/routes.tsx` (`/` → `/book`, `/book`, `/schedule`), `src/app/Layout.tsx` (skip link, nav, `<main>`), and `src/main.tsx` (await `worker.start()` when `VITE_ENABLE_MOCKS !== 'false'`, then render; set `window.__mswReady`)
- [X] T030 [P] Add UI primitives in `src/components/ui/`: `button.tsx`, `field.tsx` (label + error with `aria-describedby`), `select.tsx` (native select styled), `dialog.tsx` + `alert-dialog.tsx` (Radix), `status.tsx` (loading/empty/error-with-retry states, FR-018), `cn.ts`
- [X] T031 Implement shared query hooks in `src/api/queries.ts` for reference data and customer search (`useDealerships`, `useServiceTypes(dealershipId)`, `useCustomerSearch(q)`)

**Checkpoint**: Foundation ready — domain time/rules tested, mock backend serves reference & customers, app shell renders.

---

## Phase 3: User Story 1 — Book with real-time availability check (Priority: P1) 🎯 MVP

**Goal**: Advisor selects customer, vehicle, dealership, service type, start; sees availability
with proposed technician/bay and end time; confirms; appointment persists across reloads.

**Independent Test**: With seed data, book a free slot and verify a confirmed appointment with the
correct customer, vehicle, technician, bay and window exists after reload (quickstart V1, V2).

### Tests for User Story 1 (write first, must fail) ⚠️

- [X] T032 [P] [US1] Write failing tests in `src/domain/assignment.test.ts`: least confirmed appointments that local day wins; tie → name asc then id; CANCELLED not counted; only qualified/compatible/free candidates considered (FR-010)
- [X] T033 [P] [US1] Write failing tests in `src/domain/availability.test.ts` for `checkAvailability(req, snapshot, now)`: available case returns window `end = start + duration` and assignment; reason precedence `SERVICE_NOT_OFFERED → START_IN_PAST → DEALERSHIP_CLOSED → OUTSIDE_OPENING_HOURS → NO_QUALIFIED_TECHNICIAN → NO_COMPATIBLE_BAY`; free-but-unskilled technician never assigned; free-but-wrong-type or inactive bay never assigned; back-to-back allowed
- [X] T034 [P] [US1] Write failing tests in `src/domain/booking.test.ts` for `validateBooking` (vehicle belongs to customer, service offered, resources belong to dealership, start aligned to 15 min in dealership zone) and `buildAppointment` (reference format `APT-YYYYMMDD-XXXX` from local date, `createdAt` from injected now, `cancelledAt: null`)
- [X] T035 [P] [US1] Write contract tests `tests/contract/availability.test.ts` and `tests/contract/appointments-create.test.ts` (200 available/unavailable, 201 create, 400 bad body, 404 unknown dealership, 422 business-rule violation) validated against the contract
- [X] T036 [P] [US1] Write component test `src/features/booking/BookingPage.test.tsx`: missing vehicle/service/dealership/start shows field errors and sends no availability request (US1-4); complete form shows "Available" in `role="status"` with end time, technician, bay; Review & confirm → success with reference

### Implementation for User Story 1

- [X] T037 [P] [US1] Implement `src/domain/assignment.ts` (`pickTechnician`, `pickBay`, `findAssignment`) until T032 passes
- [X] T038 [US1] Implement `src/domain/availability.ts` (`checkAvailability`, `evaluateSlot`) until T033 passes (alternatives initially `[]`; filled in US2)
- [X] T039 [P] [US1] Implement `src/domain/booking.ts` (`validateBooking`, `buildAppointment`, `toAppointmentView`) until T034 passes; `src/domain/index.ts` barrel
- [X] T040 [US1] Implement `POST /api/availability/check` in `src/mocks/handlers/availability.ts` (400 on malformed body, 404 unknown dealership/service type, delegate to `checkAvailability`)
- [X] T041 [US1] Implement basic `POST /api/appointments` in `src/mocks/handlers/appointments.ts` (requires `Idempotency-Key` header else 400; 404 unknown refs; 422 from `validateBooking` / past start / outside hours; verify proposed technician/bay free; write appointment; 201 with `Location` and `AppointmentView`)
- [X] T042 [US1] Add `useAvailability` (query keyed `{dealershipId, serviceTypeId, start}`, enabled only when request complete, 300 ms debounce) and `useCreateAppointment` (mutation; invalidates `appointments(dealershipId, date)`) to `src/api/queries.ts`
- [X] T043 [P] [US1] Implement `src/features/booking/bookingSchema.ts` (Zod: customerId, vehicleId, dealershipId, serviceTypeId, date `yyyy-MM-dd`, time `HH:mm` in 15-minute steps)
- [X] T044 [P] [US1] Implement `src/features/booking/CustomerCombobox.tsx` (accessible combobox: input with `role="combobox"`, listbox with arrow-key navigation, debounced search ≥ 2 chars, loading/empty/error states) and vehicle select
- [X] T045 [P] [US1] Implement `src/features/booking/AvailabilityPanel.tsx` (`role="status"` `aria-live="polite"`; loading, available with window in dealership zone + technician + bay + "Review & confirm" button, unavailable with human-readable reason, error with retry)
- [X] T046 [P] [US1] Implement `src/features/booking/ReviewDialog.tsx` (summary of customer, vehicle, service, dealership, start–end, technician, bay; Confirm disabled while pending; creates `Idempotency-Key` UUID once when opened) and `src/features/booking/BookingSuccess.tsx` (reference + link to schedule for that dealership/date)
- [X] T047 [US1] Implement `src/features/booking/useBookingFlow.ts` and `src/features/booking/BookingForm.tsx` + `BookingPage.tsx` (React Hook Form; dealership select, service type select showing duration, date + 15-min time select in dealership zone; availability only requested when valid) until T036 passes; emit `availability.checked` and `booking.confirmed`
- [X] T048 [US1] Write e2e `tests/e2e/booking.spec.ts`: V1 happy path including reload and schedule link persistence

**Checkpoint**: MVP — booking works end-to-end with persistence.

---

## Phase 4: User Story 2 — Alternative slots when unavailable (Priority: P2)

**Goal**: Unavailable result states the reason and offers up to 5 nearest bookable start times
within 7 days; selecting one re-checks and becomes bookable.

**Independent Test**: With only the EV technician busy 10:00–12:00, request EV battery check at
10:30 → reason "no qualified technician" + alternatives, each bookable (quickstart V3, V4).

### Tests for User Story 2 ⚠️

- [X] T049 [P] [US2] Write failing tests in `src/domain/alternatives.test.ts` for `findAlternatives(req, snapshot, now, {limit: 5, horizonDays: 7})`: 15-min grid; candidates only on open days, fully inside opening hours, after `now`; ranked by absolute distance from requested start, ties → earlier first; at most 5; includes earlier same-day slots; next-day slots when requested window ends after close; empty array when nothing within horizon; every returned slot passes `checkAvailability`
- [X] T050 [P] [US2] Write component test `src/features/booking/AlternativesList.test.tsx` and extend `BookingPage.test.tsx`: unavailable shows reason + alternatives; choosing one updates date/time and shows "Available"; empty alternatives shows "No availability in the next 7 days"

### Implementation for User Story 2

- [X] T051 [US2] Implement `src/domain/alternatives.ts` until T049 passes and use it from `checkAvailability` in `src/domain/availability.ts` for unavailable results (except `SERVICE_NOT_OFFERED`)
- [X] T052 [US2] Implement `src/features/booking/AlternativesList.tsx` (list of buttons with times in dealership zone and relative day label, keyboard operable) and wire into `AvailabilityPanel.tsx` / `useBookingFlow.ts` until T050 passes
- [X] T053 [US2] Add human-readable reason messages in `src/features/booking/reasons.ts` (e.g. `OUTSIDE_OPENING_HOURS` → "Cannot finish within opening hours")

**Checkpoint**: US1 + US2 work independently.

---

## Phase 5: User Story 3 — Safe under concurrent bookings (Priority: P2)

**Goal**: Only one of two competing advisors gets the resources; the other gets 409 with fresh
alternatives and keeps their input; double-click/retry never duplicates.

**Independent Test**: Two sessions confirm the same last slot; second is rejected with
alternatives; exactly one appointment exists (quickstart V5, V6).

### Tests for User Story 3 ⚠️

- [X] T054 [P] [US3] Write failing handler tests `tests/contract/appointments-concurrency.test.ts`: two parallel creates for the same technician/bay/window → one 201 + one 409 `ConflictProblem` (`PROPOSED_RESOURCE_TAKEN` with requested start first in alternatives when still bookable with other resources, otherwise `NO_QUALIFIED_TECHNICIAN` / `NO_COMPATIBLE_BAY`); same `Idempotency-Key` + same body → 201 replay with `Idempotent-Replayed: true` and same id; same key + different body → 422; exactly one stored appointment
- [X] T055 [P] [US3] Write failing tests `src/mocks/lock.test.ts` (in-process fallback serializes critical sections) and `src/mocks/idempotency.test.ts` (stable request hash independent of key order)
- [X] T056 [P] [US3] Write component test `src/features/booking/Conflict.test.tsx`: on 409 the review dialog shows "This slot was just taken" in `role="alert"`, alternatives are offered, and form selections are kept; retry after a 500 reuses the same Idempotency-Key

### Implementation for User Story 3

- [X] T057 [P] [US3] Implement `src/mocks/lock.ts` (`withLock(name, fn)` via `navigator.locks.request` with in-process promise-queue fallback)
- [X] T058 [P] [US3] Implement `src/mocks/idempotency.ts` (`hashRequest`, lookup/record; records older than 24 h pruned)
- [X] T059 [US3] Rework `POST /api/appointments` in `src/mocks/handlers/appointments.ts`: inside `withLock('kss-booking')` → idempotency lookup → re-read store → verify proposed resources → write appointment + idempotency record; 409 with fresh reason/alternatives from domain; until T054 passes
- [X] T060 [US3] Handle `ConflictError` in `src/features/booking/ReviewDialog.tsx` / `useBookingFlow.ts` (alert, alternatives, keep form state, emit `booking.conflict`; keep same Idempotency-Key for retries of the same request) until T056 passes
- [X] T061 [US3] Write e2e `tests/e2e/conflict.spec.ts`: two pages in one context prepare the same EV slot, confirm A then B; B sees conflict; schedule shows exactly one

**Checkpoint**: No double-booking across tabs; idempotent confirm.

---

## Phase 6: User Story 4 — View and cancel appointments (Priority: P3)

**Goal**: Day view per dealership in start order with status; cancel with confirmation; freed
resources become bookable.

**Independent Test**: Open a seeded day, cancel one appointment → shows Cancelled and the same
slot can be booked again (quickstart V7).

### Tests for User Story 4 ⚠️

- [X] T062 [P] [US4] Write contract tests `tests/contract/appointments-read-cancel.test.ts`: `GET /api/appointments?dealershipId&date[&status]` ordered by start (400 missing params, 404 unknown dealership), `GET /api/appointments/{id}` (404), `POST /api/appointments/{id}/cancel` (200, idempotent, `cancelledAt` set; 404); after cancel, `checkAvailability` for the same slot is available
- [X] T063 [P] [US4] Write component test `src/features/schedule/SchedulePage.test.tsx`: list in start order with details/status; empty state; error state with retry; cancel via alert dialog (keyboard) → status Cancelled

### Implementation for User Story 4

- [X] T064 [US4] Implement list/get/cancel handlers in `src/mocks/handlers/appointments.ts` (local date bounds via `src/domain/time.ts`; denormalised `AppointmentView`) until T062 passes
- [X] T065 [US4] Add `useAppointments(dealershipId, date)` and `useCancelAppointment` (invalidate list + availability) to `src/api/queries.ts`
- [X] T066 [P] [US4] Implement `src/features/schedule/ScheduleFilters.tsx` (dealership + date bound to URL search params) and `src/features/schedule/AppointmentList.tsx` (table: time, customer, vehicle, service, technician, bay, status badge)
- [X] T067 [P] [US4] Implement `src/features/schedule/CancelDialog.tsx` (Radix AlertDialog; emits `booking.cancelled`)
- [X] T068 [US4] Implement `src/features/schedule/SchedulePage.tsx` until T063 passes

**Checkpoint**: All user stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T069 [P] Implement `src/observability/RouteErrorBoundary.tsx` (react-error-boundary; logs, shows "Something went wrong", Try again, correlation id) and global `unhandledrejection`/`error` logging in `src/main.tsx`
- [X] T070 [P] Implement `src/observability/webVitals.ts` (LCP, INP, CLS → telemetry) and call from `src/main.tsx`
- [X] T071 [P] Implement `src/devtools/MockDevPanel.tsx` (Reset demo data, latency, failure rate, fail-next-request; rendered only when mocks enabled)
- [X] T072 [P] Write `src/features/**` error-state test (`src/features/schedule/ErrorRetry.test.tsx`): 500 → error with Retry and reference id → retry succeeds without losing data (V10)
- [X] T073 [P] Write `tests/e2e/a11y.spec.ts`: keyboard-only booking (V9) and axe scan of `/book` and `/schedule` with zero serious/critical violations
- [X] T074 [P] Add GitHub Actions `.github/workflows/ci.yml`: install → lint → typecheck → contract:check → test:coverage → build → e2e
- [X] T075 [P] Write `docs/system-design.md` (architecture diagram, components, data flows, tech choices, concurrency, observability, GenAI usage) and `README.md` (overview, run, scripts, structure, testing, AI collaboration narrative)
- [X] T076 Update `docs/ai-collaboration-log.md` with implementation-phase entries
- [X] T077 Run full validation: `pnpm lint && pnpm typecheck && pnpm contract:check && pnpm test:coverage && pnpm build && pnpm e2e`; walk quickstart V1–V10

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories → **Polish (Phase 7)**
- **US1 (P1)**: depends only on Foundational
- **US2 (P2)**: depends on US1 domain `checkAvailability` (T038) and `AvailabilityPanel` (T045)
- **US3 (P2)**: depends on US1 create handler (T041) and `ReviewDialog` (T046); its conflict UI reuses US2's `AlternativesList` (T052)
- **US4 (P3)**: depends only on Foundational + `src/domain/booking.ts` `toAppointmentView` (T039); can run in parallel with US2/US3

### Within Each User Story

- Tests written and failing before implementation (Principle III)
- Domain → mock handlers → query hooks → components → e2e

### Parallel Opportunities

- Setup: T004, T005, T006, T008, T009
- Foundational: T010/T011/T013 tests; T015–T021 mock pieces; T023/T024; T026/T027; T030
- US1: T032–T036 tests together; T037, T039, T043–T046 together
- US2: T049, T050
- US3: T054–T056 tests; T057, T058
- US4: T062, T063 tests; T066, T067
- Polish: T069–T075

### Parallel Example: User Story 1

```text
Task: "T032 [US1] assignment tests in src/domain/assignment.test.ts"
Task: "T033 [US1] availability tests in src/domain/availability.test.ts"
Task: "T034 [US1] booking tests in src/domain/booking.test.ts"
Task: "T035 [US1] contract tests in tests/contract/availability.test.ts"
Task: "T036 [US1] component test in src/features/booking/BookingPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **stop and validate** quickstart V1/V2 → demo

### Incremental Delivery

1. + US2 (alternatives) → V3/V4
2. + US3 (concurrency/idempotency) → V5/V6
3. + US4 (schedule & cancel) → V7
4. Polish → V8–V10, CI, docs

Each phase ends with a commit referencing its task IDs (Constitution: Development Workflow).
