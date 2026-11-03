import { localDate, localTime, toInstant, zonedToInstant } from '@/domain'

/** All UI date/time formatting happens in the dealership's zone, never the device's (FR-017). */
const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(opts)}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone, ...opts })
    fmtCache.set(key, f)
  }
  return f
}

export function formatTime(instant: string, timeZone: string): string {
  return fmt(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
}

export function formatDate(instant: string, timeZone: string): string {
  return fmt(timeZone, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(instant))
}

export function formatShortDate(instant: string, timeZone: string): string {
  return fmt(timeZone, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(instant))
}

export function formatRange(start: string, end: string, timeZone: string): string {
  return `${formatDate(start, timeZone)}, ${formatTime(start, timeZone)}–${formatTime(end, timeZone)}`
}

export function todayIn(timeZone: string, nowMs: number = Date.now()): string {
  return localDate(toInstant(nowMs), timeZone)
}

/** Local date + `HH:mm` in the dealership zone → ISO UTC instant. */
export function toInstantInZone(date: string, time: string, timeZone: string): string {
  return zonedToInstant(date, time, timeZone)
}

export function splitInZone(instant: string, timeZone: string): { date: string; time: string } {
  return { date: localDate(instant, timeZone), time: localTime(instant, timeZone) }
}

/** 15-minute start-time options (FR-003). The domain decides what is actually bookable. */
export const TIME_OPTIONS: string[] = Array.from({ length: (22 - 6) * 4 }, (_, i) => {
  const minutes = 6 * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
