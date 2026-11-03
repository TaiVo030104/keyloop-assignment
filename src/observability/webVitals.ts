import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'
import { recordMetric } from './telemetry'

/** Reports Core Web Vitals through the telemetry sink (research R14). */
export function startWebVitals(): void {
  const report = (m: Metric) => recordMetric(`web-vitals.${m.name}`, m.value, { rating: m.rating, id: m.id })
  onLCP(report)
  onINP(report)
  onCLS(report)
}
