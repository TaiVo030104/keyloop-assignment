# Keyloop Unified Service Scheduler

A web app that service advisors use to book dealership service appointments. It replaces manual
booking. The advisor picks a customer's vehicle, a service type, a dealership and a start time.
The app checks in real time that a compatible **bay** and a **qualified technician** are both free
for the whole service. If they are, the advisor confirms a persistent appointment. If not, the app
says why and suggests the nearest alternative times. Two advisors cannot double-book the same
resource.

- Specification: [specs/001-service-scheduler/spec.md](specs/001-service-scheduler/spec.md)
- System design: [docs/system-design.md](docs/system-design.md)
- API contract (OpenAPI 3.1): [contracts/openapi.yaml](contracts/openapi.yaml)

## Quick start

Requires Node.js 22 or later.

```bash
corepack enable            # provides pnpm
pnpm install
pnpm dev                   # http://localhost:5173
```

The backend runs as a mock inside the browser (Mock Service Worker). Data is stored in
localStorage, so it survives a reload. Use the **Mock backend controls** panel in the bottom-right
corner to reset the demo data, add latency, or inject server errors.

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build && pnpm preview` | Run the dev server / serve the production build |
| `pnpm lint`, `pnpm typecheck` | Static checks |
| `pnpm test` | Unit, contract and component tests (Vitest) |
| `pnpm test:coverage` | The same tests, failing if `src/domain` coverage drops below 90% |
| `pnpm e2e` | Playwright end-to-end tests, including the two-tab conflict and an axe accessibility scan. Run `pnpm exec playwright install chromium` once first |
| `pnpm contract:gen` / `contract:check` / `contract:lint` | Regenerate API types / fail if the generated types differ from the contract / lint the contract |

## Try it

The seed data puts appointments on the next weekday. The step-by-step scenarios V1–V10 are in
[quickstart.md](specs/001-service-scheduler/quickstart.md). Some quick ones:

1. **Book.** Search "smith", choose a vehicle, then choose *Brake service* at 10:00 on a future
   weekday. The panel shows the end time (11:30) and the proposed technician and bay. Review the
   details and confirm to get a reference such as `APT-20261104-K3Q9`.
2. **Get alternatives.** London has only one EV technician. Ask for an *EV battery check* at 13:30
   on the seeded day: the panel says no qualified technician is free and lists the nearest times
   that would work.
3. **Two advisors.** Open two tabs and prepare the same EV slot in both. Confirm in the first tab,
   then in the second. The second tab shows "This slot was just taken" with fresh alternatives.
4. **Time zones.** Switch to *Keyloop Motors Saigon*. All times are shown in the dealership's local
   time, whatever time zone the advisor's device uses.

## Project layout

```text
contracts/openapi.yaml     API contract — source of truth (types are generated from it)
src/domain/                Pure scheduling rules, tested first, 100% coverage
src/mocks/                 MSW handlers, localStorage store, Web Lock, idempotency, chaos, seed
src/api/                   Generated schema, single observable client, TanStack Query hooks
src/features/booking/      Booking flow (form, availability panel, alternatives, review, success)
src/features/schedule/     Day view and cancellation
src/observability/         Structured logger, telemetry, correlation/trace ids, error boundary
tests/contract/            Every endpoint's responses validated against the OpenAPI schema
tests/e2e/                 Playwright: booking, cancel/rebook, two-tab conflict, keyboard-only, axe
specs/001-service-scheduler/  Spec, plan, research, data model, tasks
```

## Testing

| Level | What is covered | Count |
|---|---|---|
| Domain unit tests | Overlap edges, DST, opening hours, skill and bay matching, workload balancing, reason precedence, alternatives ranking, booking decision, a 20 ms performance budget | 85 |
| Contract and handler tests | All 8 operations' 2xx and error responses validated with Ajv; parallel confirms (one 201, one 409); idempotent replay; key reuse returns 422 | 31 |
| Mock infrastructure | Lock serialisation, request hashing, pruning of idempotency records | 3 |
| Component tests | Missing-field messages, available → review → confirm, alternatives, error and retry, conflict recovery, retry reusing the same key, schedule list and cancel, axe | 17 |
| End-to-end tests | V1 book and reload, V7 cancel and rebook, V5 two tabs, V9 keyboard-only, axe on both pages | 6 |

## AI collaboration

Development followed the GitHub Spec-Kit workflow with Claude Code as the implementing agent:
constitution → specify → plan → tasks → implement. The
[constitution](.specify/memory/constitution.md) set the guardrails before any code was written:
the API is contract-first, the domain is pure, business rules are tested first, and
double-booking must be impossible.

How the AI's output was kept honest:

- **Tests came before domain code.** The boundary cases (back-to-back windows, a one-minute
  overlap, DST days, inactive bays, technicians not working that day) were written as tests and
  run red before any implementation existed.
- **Docs were the referee.** When the AI's first alternatives tests expected slots on days
  *before* the requested day, they contradicted research decision R9. The tests were changed to
  match the documented decision; the documented decision was not changed to match the tests.
- **End-to-end tests caught what jsdom missed.** Auto-selecting a customer's only vehicle worked
  in component tests but not in a real browser, because the form value was set before its
  `<option>` was rendered. It was fixed and a regression test was added.
- **Design reviewed before testing.** In the first version, the review dialog was bound to the
  live availability result, so a 409 would have unmounted it and hidden the conflict message. This
  was caught on review and fixed by taking a snapshot of what the advisor reviewed.

- **Numbers in the docs were measured.** The design promised that an availability check would
  take under 20 ms. A performance test written to back that up failed at about 30 ms. The
  alternative search was then optimised to about 5 ms, with no change in behaviour, and the test
  now guards the budget in CI.

How the final quality is ensured: every change must pass the same gates locally and in CI. They
are lint (strict TypeScript, accessibility rules, and ESLint rules that keep the domain pure),
type-check, contract lint, contract drift, tests with a 90% domain coverage gate, build, and
Playwright end-to-end tests with an axe scan. No AI-written code is accepted unless all of these
pass.

The full log is in [docs/ai-collaboration-log.md](docs/ai-collaboration-log.md).
