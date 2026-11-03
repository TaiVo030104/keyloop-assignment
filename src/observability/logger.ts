/**
 * Structured logging with swappable sinks (Constitution VI, research R14).
 * Every event is a flat JSON object: { ts, level, event, ...fields }.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEvent {
  ts: string
  level: LogLevel
  event: string
  [field: string]: unknown
}

export type LogSink = (e: LogEvent) => void

export const consoleSink: LogSink = (e) => {
  const fn = e.level === 'error' ? console.error : e.level === 'warn' ? console.warn : console.info
  fn(`[${e.event}]`, e)
}

/** Keeps the last `max` events in memory — used by tests and the dev panel. */
export function createMemorySink(max = 500): LogSink & { events: LogEvent[]; clear(): void } {
  const events: LogEvent[] = []
  const sink = ((e: LogEvent) => {
    events.push(e)
    if (events.length > max) events.shift()
  }) as LogSink & { events: LogEvent[]; clear(): void }
  sink.events = events
  sink.clear = () => {
    events.length = 0
  }
  return sink
}

/** Ships events with `navigator.sendBeacon` to a collector URL (off unless configured). */
export function createBeaconSink(url: string): LogSink {
  return (e) => {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon(url, JSON.stringify(e))
    }
  }
}

export const memorySink = createMemorySink()

const isTest = import.meta.env.MODE === 'test'
let sinks: LogSink[] = isTest ? [memorySink] : [consoleSink, memorySink]

export function setSinks(next: LogSink[]): void {
  sinks = next
}

export function addSink(sink: LogSink): void {
  sinks = [...sinks, sink]
}

function emit(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const e: LogEvent = { ts: new Date().toISOString(), level, event, ...fields }
  for (const s of sinks) {
    try {
      s(e)
    } catch {
      // a failing sink must never break the app
    }
  }
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),
}
