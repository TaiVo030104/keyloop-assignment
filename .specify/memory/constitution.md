# Keyloop Unified Service Scheduler Constitution

## Core Principles

### I. Contract-First API Boundary

- The OpenAPI 3.1 document in `contracts/` is the single source of truth for every request and
  response exchanged between the UI and the (mocked) backend.
- Client-side API types MUST be generated from the contract; hand-written duplicates of API
  shapes are forbidden.
- Any change to API behaviour MUST start with a contract change in the same commit.

**Rationale**: Only the frontend is implemented. A strict contract lets a real backend replace
the mock with zero UI changes, and doubles as the API deliverable required by the assessment.

### II. Pure, Framework-Free Domain Logic

- Scheduling rules (time-window overlap, operating hours, technician qualification, bay
  compatibility, resource selection, alternative-slot suggestion) MUST live in `src/domain/` as
  pure TypeScript functions with no React, network, storage or global clock access.
- Current time MUST be injected as a parameter, never read from `Date.now()` inside domain code.
- UI components MUST NOT re-implement or duplicate scheduling rules.

**Rationale**: The core business logic must be testable in isolation and portable to a future
backend service unchanged.

### III. Test-First for Business Rules (NON-NEGOTIABLE)

- Every domain rule MUST have failing unit tests written before its implementation
  (Red → Green → Refactor).
- Boundary cases MUST be covered explicitly: back-to-back bookings, partial overlaps, bookings
  touching opening/closing time, missing skills, incompatible bay types, cancelled appointments.
- Domain code MUST maintain ≥ 90% line and branch coverage; CI fails below that threshold.
- User-facing flows MUST have component/integration tests; the booking happy path and the
  conflict path MUST have end-to-end tests.

**Rationale**: AI-generated code is only trusted once tests written or reviewed by a human
prove it correct.

### IV. Realistic Mock Backend

- The mock API MUST run at the network layer so the application code is identical to production.
- It MUST persist data across page reloads and expose a reset/seed capability.
- It MUST simulate latency and the contract's error responses (400/404/409/422/500) so that
  loading, error and retry states are exercised.
- The mock MUST call the same domain functions the tests verify; it MUST NOT contain its own
  scheduling logic.

**Rationale**: A believable mock proves the UI handles real-world conditions, not only the
happy path.

### V. No Double-Booking

- An appointment MUST only be confirmed if one bay AND one qualified technician are free for the
  entire interval `[start, end)` where `end = start + service duration`.
- Availability MUST be re-validated at confirmation time; a stale availability result MUST
  produce a conflict response, never a silent double-booking.
- Booking submission MUST be idempotent (client-supplied idempotency key) so retries and
  double-clicks cannot create duplicates.

**Rationale**: Resource integrity is the central promise of the scheduler.

### VI. Observable by Default

- All API calls MUST go through a single client that attaches a correlation/trace id and emits
  structured log events (operation, status, duration, trace id).
- Unhandled UI errors MUST be caught by an error boundary, logged, and shown with a recovery
  action.
- Key business events (availability checked, booking confirmed, booking conflict, cancellation)
  and Web Vitals MUST be recorded through one telemetry module whose sink can be swapped.

**Rationale**: Production readiness includes being able to diagnose failures.

### VII. Accessible, Simple UI

- UI MUST meet WCAG 2.1 AA: full keyboard operation, visible focus, labelled form controls,
  status messages announced to assistive technology.
- Prefer the simplest design that satisfies the spec (YAGNI); every added dependency or
  abstraction MUST be justified in the plan.

**Rationale**: Service advisors work quickly under pressure; clarity beats cleverness.

## Technology & Quality Constraints

- Language: TypeScript in `strict` mode; `any` is forbidden outside generated files.
- All dates are stored and exchanged as ISO-8601 UTC; they are displayed in the dealership's
  time zone.
- Lint, type-check, unit/integration tests and build MUST pass locally and in CI before merge.
- No secrets or real personal data in the repository; seed data is synthetic.

## Development Workflow & AI Collaboration

- Work follows the Spec-Kit flow: constitution → specify → clarify → plan → tasks → analyze →
  implement. No implementation starts before the spec, plan and tasks are human-reviewed.
- AI agents implement one task phase at a time; a human reviews every diff before commit.
- Each phase ends with a commit whose message references the task IDs it completes.
- Notable AI mistakes, overrides and corrections MUST be recorded in
  `docs/ai-collaboration-log.md`; this log feeds the README's AI Collaboration Narrative.

## Governance

- This constitution supersedes conflicting guidance in other project documents.
- Amendments require: a written rationale, a semantic version bump, and an updated Sync Impact
  Report. MAJOR = principle removed or redefined; MINOR = principle or section added;
  PATCH = wording only.
- Every plan MUST include a Constitution Check; violations MUST be listed with justification in
  the plan's Complexity Tracking table or be resolved before implementation.
- Reviews (human or `/speckit-analyze`) MUST verify compliance with principles I–VII.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
