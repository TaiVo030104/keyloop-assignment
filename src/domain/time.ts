import { TZDate } from '@date-fns/tz'
import type { Instant, LocalDate, TimeWindow } from './types'

const MINUTE = 60_000

export function toMs(i: Instant): number {
  return Date.parse(i)
}

/** Formats epoch milliseconds as an ISO UTC instant without milliseconds. */
export function toInstant(ms: number): Instant {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function addMinutes(i: Instant, minutes: number): Instant {
  return toInstant(toMs(i) + minutes * MINUTE)
}

/** Half-open overlap: conflicting iff a starts before b ends AND a ends after b starts (FR-006). */
export function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  return toMs(a.start) < toMs(b.end) && toMs(b.start) < toMs(a.end)
}

function parseDate(d: LocalDate): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number]
  return [y, m, day]
}

export function parseHHmm(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number) as [number, number]
  return [h, m]
}

/** Local wall-clock date + `HH:mm` in `timeZone` → UTC instant. */
export function zonedToInstant(date: LocalDate, time: string, timeZone: string): Instant {
  const [y, m, d] = parseDate(date)
  const [hh, mm] = parseHHmm(time)
  return toInstant(new TZDate(y, m - 1, d, hh, mm, timeZone).getTime())
}

function zoned(i: Instant, timeZone: string): TZDate {
  return new TZDate(toMs(i), timeZone)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function localDate(i: Instant, timeZone: string): LocalDate {
  const z = zoned(i, timeZone)
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`
}

export function localTime(i: Instant, timeZone: string): string {
  const z = zoned(i, timeZone)
  return `${pad(z.getHours())}:${pad(z.getMinutes())}`
}

/** ISO weekday (1 = Monday … 7 = Sunday) of the instant in `timeZone`. */
export function isoWeekdayInZone(i: Instant, timeZone: string): number {
  return zoned(i, timeZone).getDay() || 7
}

/** `[00:00, next 00:00)` of a local date as UTC instants (23/25 h on DST change days). */
export function localDayBounds(date: LocalDate, timeZone: string): TimeWindow {
  const [y, m, d] = parseDate(date)
  return {
    start: toInstant(new TZDate(y, m - 1, d, 0, 0, timeZone).getTime()),
    end: toInstant(new TZDate(y, m - 1, d + 1, 0, 0, timeZone).getTime()),
  }
}

/** True when the local wall-clock time is on a 15-minute boundary with zero seconds (FR-003). */
export function isAlignedTo15InZone(i: Instant, timeZone: string): boolean {
  const z = zoned(i, timeZone)
  return z.getMinutes() % 15 === 0 && z.getSeconds() === 0 && z.getMilliseconds() === 0
}

/** Calendar arithmetic on a local date string (time-zone independent). */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = parseDate(date)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}
