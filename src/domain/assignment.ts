import { isBayCompatible, isQualified } from './rules'
import { isoWeekdayInZone, localDate, toMs } from './time'
import type { Appointment, Assignment, LocalDate, SchedulingContext, TimeWindow, UnavailableReason } from './types'

type Kind = 'technician' | 'bay'

/**
 * Pre-parsed view of CONFIRMED appointments: busy intervals (epoch ms) and per-day booking
 * counts for each resource. Built once per search so that scanning hundreds of candidate
 * slots does not re-parse every appointment each time (plan.md performance budget).
 */
export interface BusyIndex {
  busy: Map<string, [number, number][]>
  countsByDay: Map<string, number>
}

const key = (kind: Kind, id: string) => `${kind}:${id}`
const dayKey = (kind: Kind, id: string, day: LocalDate) => `${kind}:${id}:${day}`

export function buildBusyIndex(appointments: readonly Appointment[], timeZone: string): BusyIndex {
  const busy = new Map<string, [number, number][]>()
  const countsByDay = new Map<string, number>()
  for (const a of appointments) {
    if (a.status !== 'CONFIRMED') continue
    const interval: [number, number] = [toMs(a.start), toMs(a.end)]
    const day = localDate(a.start, timeZone)
    for (const [kind, id] of [['technician', a.technicianId], ['bay', a.bayId]] as const) {
      const list = busy.get(key(kind, id))
      if (list) list.push(interval)
      else busy.set(key(kind, id), [interval])
      countsByDay.set(dayKey(kind, id, day), (countsByDay.get(dayKey(kind, id, day)) ?? 0) + 1)
    }
  }
  return { busy, countsByDay }
}

function isFreeIn(index: BusyIndex, kind: Kind, id: string, startMs: number, endMs: number): boolean {
  // Half-open overlap (FR-006): busy iff s < end && start < e.
  return !(index.busy.get(key(kind, id)) ?? []).some(([s, e]) => s < endMs && startMs < e)
}

export function countConfirmedOnDay(
  kind: Kind,
  resourceId: string,
  day: LocalDate,
  timeZone: string,
  appointments: readonly Appointment[],
): number {
  return buildBusyIndex(appointments, timeZone).countsByDay.get(dayKey(kind, resourceId, day)) ?? 0
}

/** Fewest bookings wins; ties broken by name, then id — deterministic (FR-010). */
export function pickLeastBooked<T extends { id: string; name: string }>(
  candidates: readonly T[],
  countFor: (candidate: T) => number,
): T | undefined {
  return [...candidates]
    .map((c) => ({ c, n: countFor(c) }))
    .sort((a, b) => a.n - b.n || a.c.name.localeCompare(b.c.name) || a.c.id.localeCompare(b.c.id))[0]?.c
}

export type AssignmentResult =
  | { ok: true; assignment: Assignment }
  | { ok: false; reason: Extract<UnavailableReason, 'NO_QUALIFIED_TECHNICIAN' | 'NO_COMPATIBLE_BAY'> }

export interface AssignmentHints {
  /** Reuse across many windows of the same context. */
  index?: BusyIndex
  /** Local date / ISO weekday of `window.start`, if already known. */
  day?: LocalDate
  weekday?: number
}

/** Chooses a free qualified technician and a free compatible bay for the window (FR-005, FR-010). */
export function findAssignment(ctx: SchedulingContext, window: TimeWindow, hints: AssignmentHints = {}): AssignmentResult {
  const { dealership, serviceType } = ctx
  const tz = dealership.timeZone
  const index = hints.index ?? buildBusyIndex(ctx.appointments, tz)
  const day = hints.day ?? localDate(window.start, tz)
  const weekday = hints.weekday ?? isoWeekdayInZone(window.start, tz)
  const startMs = toMs(window.start)
  const endMs = toMs(window.end)
  const count = (kind: Kind, id: string) => index.countsByDay.get(dayKey(kind, id, day)) ?? 0

  const technician = pickLeastBooked(
    ctx.technicians.filter(
      (t) =>
        t.dealershipId === dealership.id &&
        isQualified(t, serviceType, weekday) &&
        isFreeIn(index, 'technician', t.id, startMs, endMs),
    ),
    (t) => count('technician', t.id),
  )
  if (!technician) return { ok: false, reason: 'NO_QUALIFIED_TECHNICIAN' }

  const bay = pickLeastBooked(
    ctx.bays.filter(
      (b) => b.dealershipId === dealership.id && isBayCompatible(b, serviceType) && isFreeIn(index, 'bay', b.id, startMs, endMs),
    ),
    (b) => count('bay', b.id),
  )
  if (!bay) return { ok: false, reason: 'NO_COMPATIBLE_BAY' }

  return {
    ok: true,
    assignment: { technician: { id: technician.id, name: technician.name }, bay: { id: bay.id, name: bay.name } },
  }
}
