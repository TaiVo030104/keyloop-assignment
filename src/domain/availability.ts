import { findAlternatives } from './alternatives'
import { findAssignment } from './assignment'
import { isOpenDay, isWithinOpeningHours } from './rules'
import { addMinutes, toMs } from './time'
import type { Assignment, AvailabilityResult, Instant, SchedulingContext, TimeWindow, UnavailableReason } from './types'

export type SlotEvaluation =
  | { ok: true; window: TimeWindow; assignment: Assignment }
  | { ok: false; window: TimeWindow; reason: UnavailableReason }

export function windowFor(ctx: SchedulingContext, start: Instant): TimeWindow {
  return { start, end: addMinutes(start, ctx.serviceType.durationMinutes) }
}

/**
 * Evaluates one start time. Reason precedence (data-model.md):
 * SERVICE_NOT_OFFERED → START_IN_PAST → DEALERSHIP_CLOSED → OUTSIDE_OPENING_HOURS
 * → NO_QUALIFIED_TECHNICIAN → NO_COMPATIBLE_BAY.
 */
export function evaluateSlot(ctx: SchedulingContext, start: Instant, now: Instant): SlotEvaluation {
  const window = windowFor(ctx, start)
  const fail = (reason: UnavailableReason): SlotEvaluation => ({ ok: false, window, reason })

  if (!ctx.dealership.serviceTypeIds.includes(ctx.serviceType.id)) return fail('SERVICE_NOT_OFFERED')
  if (toMs(start) <= toMs(now)) return fail('START_IN_PAST')
  if (!isOpenDay(ctx.dealership, start)) return fail('DEALERSHIP_CLOSED')
  if (!isWithinOpeningHours(ctx.dealership, window)) return fail('OUTSIDE_OPENING_HOURS')

  const assignment = findAssignment(ctx, window)
  return assignment.ok ? { ok: true, window, assignment: assignment.assignment } : fail(assignment.reason)
}

/** Read-only availability check with alternatives when unavailable (FR-005..FR-010). */
export function checkAvailability(ctx: SchedulingContext, start: Instant, now: Instant): AvailabilityResult {
  const r = evaluateSlot(ctx, start, now)
  if (r.ok) return { available: true, window: r.window, ...r.assignment }
  return {
    available: false,
    window: r.window,
    reason: r.reason,
    alternatives: r.reason === 'SERVICE_NOT_OFFERED' ? [] : findAlternatives(ctx, start, now),
  }
}
