import { buildBusyIndex, findAssignment } from './assignment'
import { isOpenDay } from './rules'
import { addLocalDays, isoWeekdayInZone, localDate, toInstant, toMs, zonedToInstant } from './time'
import type { Instant, SchedulingContext } from './types'

export interface AlternativeOptions {
  limit?: number
  horizonDays?: number
}

const DAY_MS = 24 * 3600_000
const MINUTE_MS = 60_000

/**
 * Nearest bookable start times (research R9): 15-minute grid from the requested local day's
 * opening, up to `horizonDays` after the requested start (or after now, if that is later);
 * only starts after `now`; ranked by |candidate − requested|, ties → earlier first.
 *
 * Candidates are generated inside opening hours on open days, so each one only needs the
 * resource check. Appointments are indexed once per search (plan.md: < 20 ms budget).
 */
export function findAlternatives(
  ctx: SchedulingContext,
  requestedStart: Instant,
  now: Instant,
  { limit = 5, horizonDays = 7 }: AlternativeOptions = {},
): Instant[] {
  const { dealership } = ctx
  if (!dealership.serviceTypeIds.includes(ctx.serviceType.id)) return []
  const { timeZone, openingHours } = dealership
  const requestedMs = toMs(requestedStart)
  const nowMs = toMs(now)
  const anchorMs = Math.max(requestedMs, nowMs)
  const horizonMs = anchorMs + horizonDays * DAY_MS
  const firstDay = localDate(anchorMs === requestedMs ? requestedStart : now, timeZone)
  const lastDay = localDate(toInstant(horizonMs), timeZone)
  const durationMs = ctx.serviceType.durationMinutes * MINUTE_MS
  const index = buildBusyIndex(ctx.appointments, timeZone)

  const found: number[] = []
  for (let day = firstDay; day <= lastDay; day = addLocalDays(day, 1)) {
    const openIso = zonedToInstant(day, openingHours.open, timeZone)
    if (!isOpenDay(dealership, openIso)) continue
    const weekday = isoWeekdayInZone(openIso, timeZone)
    const closeMs = toMs(zonedToInstant(day, openingHours.close, timeZone))
    for (let ms = toMs(openIso); ms + durationMs <= closeMs; ms += 15 * MINUTE_MS) {
      if (ms <= nowMs || ms > horizonMs) continue
      const window = { start: toInstant(ms), end: toInstant(ms + durationMs) }
      if (findAssignment(ctx, window, { index, day, weekday }).ok) found.push(ms)
    }
  }

  return found
    .sort((a, b) => Math.abs(a - requestedMs) - Math.abs(b - requestedMs) || a - b)
    .slice(0, limit)
    .map(toInstant)
}
