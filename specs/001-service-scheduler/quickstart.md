# Quickstart & Validation Guide: Unified Service Scheduler

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This guide proves the feature works end-to-end once implemented. It references the
[API contract](./contracts/openapi.yaml) and [data model](./data-model.md) instead of repeating them.

## Prerequisites

- Node.js 22 LTS or newer, pnpm 9+ (`corepack enable`)
- A Chromium-based browser (Playwright installs its own for e2e)

## Setup & run

```bash
pnpm install
pnpm contract:gen          # regenerate src/api/schema.gen.ts from contracts/openapi.yaml
pnpm dev                   # http://localhost:5173 — MSW mock backend enabled, seed data loaded
```

Other scripts:

| Command | Purpose |
|---|---|
| `pnpm lint && pnpm typecheck` | Static checks |
| `pnpm test` | Unit + contract + component tests (Vitest) |
| `pnpm test:coverage` | Fails if `src/domain` < 90% lines/branches |
| `pnpm e2e` | Playwright end-to-end + axe accessibility scan |
| `pnpm contract:check` | Fails if generated types differ from the contract |
| `pnpm build && pnpm preview` | Production build with mocks (`VITE_ENABLE_MOCKS=true`) |

Demo controls (dev panel, bottom-right): **Reset demo data**, latency slider, failure-rate
slider, "fail next request".

## Validation scenarios

Seed data is generated relative to today; times below are in the dealership's local time.
Use **Keyloop Motors London** unless stated. Pick a future open day (Mon–Sat).

### V1 — Book an available slot (US1, FR-001…FR-013)

1. Open `/book`. Search customer `"smith"`, pick a vehicle.
2. Choose dealership London, service **Brake service (90 min)**, a date, start `10:00`.
3. **Expect**: within ~1 s an "Available" panel announces end time `11:30`, proposed technician
   and bay.
4. Click **Review & confirm** → **Confirm**.
5. **Expect**: success with reference `APT-YYYYMMDD-XXXX`; link to the schedule.
6. Reload the page and open `/schedule?dealershipId=…&date=…`.
   **Expect**: the appointment is listed with identical details (SC-004).

### V2 — Missing input (US1 scenario 4)

Leave vehicle empty and try to continue. **Expect**: field-level message, no availability
request in the network tab / logs.

### V3 — Alternatives when no qualified technician (US2)

1. Book **EV battery check** at 10:00 (London has exactly one EV technician).
2. Start a new booking: EV battery check at 10:30 the same day.
3. **Expect**: "Unavailable — no qualified technician free" and up to 5 alternative times
   (e.g. 12:00, 08:00 if still free); selecting one re-checks and shows "Available".

### V4 — Outside opening hours (US2 scenario 2)

Request a 90-minute service at 17:00 (closes 18:00). **Expect**: reason "Cannot finish within
opening hours" and earlier/next-day alternatives.

### V5 — Two advisors, one slot (US3)

1. Open `/book` in **two tabs**. In both, prepare the same EV battery check at the same free time
   and open the review dialog.
2. Confirm in tab A → success.
3. Confirm in tab B. **Expect**: "This slot was just taken" with fresh alternatives; the form
   keeps customer/vehicle/service selections.
4. Schedule view shows exactly one appointment for that slot.

### V6 — Idempotent confirm (US3 scenario 2, FR-014)

Set "fail next request" in the dev panel, confirm → error with **Retry**; click Retry.
Also double-click Confirm. **Expect**: exactly one appointment in all cases.

### V7 — View and cancel (US4)

Open `/schedule` for a seeded day. **Expect**: appointments in start order with status. Cancel
one (confirm dialog) → status "Cancelled"; book the same technician/bay/time again → succeeds.

### V8 — Time zone (FR-017)

Change the OS/browser time zone (or run `TZ=America/New_York pnpm dev`). Switch to **Keyloop
Motors Saigon**. **Expect**: inputs and listed times are in Saigon local time; opening hours
07:30–17:30 respected.

### V9 — Keyboard & screen reader (FR-020, SC-006)

Complete V1 and V7 using only Tab/Shift+Tab/Enter/Space/Arrow keys. **Expect**: visible focus at
every step; availability result announced (live region). `pnpm e2e` includes an axe scan with
zero serious/critical violations.

### V10 — Errors and observability (FR-018, FR-019)

Set failure rate to 100%, open `/schedule`. **Expect**: error state with Retry and a reference
id. Browser console (dev sink) shows structured `api.request` events containing the same
`traceId`/correlation id, plus `booking.confirmed` / `booking.conflict` / `booking.cancelled`
events from earlier scenarios.

## Automated coverage map

| Scenario | Automated by |
|---|---|
| V1, V5, V9 | Playwright (`tests/e2e/booking.spec.ts`, `conflict.spec.ts`, `a11y.spec.ts`) |
| V2, V3, V4, V6, V7, V10 | Vitest + RTL + MSW (`src/features/**/*.test.tsx`) |
| Domain rules behind V1–V8 | Vitest unit (`src/domain/**/*.test.ts`) |
| Contract conformance | `tests/contract/*.test.ts` (responses validated against OpenAPI) |
