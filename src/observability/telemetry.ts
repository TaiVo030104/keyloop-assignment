import { logger } from './logger'

/** Business events (FR-019) and simple metrics, routed through the logger's sinks. */
export type BusinessEvent =
  | 'availability.checked'
  | 'booking.confirmed'
  | 'booking.conflict'
  | 'booking.cancelled'
  | 'api.error'
  | 'ui.error'

const counters = new Map<string, number>()

export function track(event: BusinessEvent, props: Record<string, unknown> = {}): void {
  counters.set(event, (counters.get(event) ?? 0) + 1)
  logger.info(event, { kind: 'business', ...props })
}

export function recordMetric(name: string, value: number, props: Record<string, unknown> = {}): void {
  logger.info('metric', { kind: 'metric', name, value, ...props })
}

export function counter(event: BusinessEvent): number {
  return counters.get(event) ?? 0
}
