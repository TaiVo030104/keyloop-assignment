import createClient, { type Middleware } from 'openapi-fetch'
import { newTraceContext } from '@/observability/correlation'
import { logger } from '@/observability/logger'
import { recordMetric, track } from '@/observability/telemetry'
import { ApiError, toApiError } from './errors'
import type { paths } from './schema.gen'

/**
 * The single API client (Constitution VI). Every request gets an `X-Correlation-Id` and a
 * W3C `traceparent`; every response is logged as `api.request` with status and duration.
 */
const started = new Map<string, { t0: number; correlationId: string; traceId: string }>()

const observability: Middleware = {
  onRequest({ request, id }) {
    const trace = newTraceContext()
    request.headers.set('X-Correlation-Id', trace.correlationId)
    request.headers.set('traceparent', trace.traceparent)
    started.set(id, { t0: performance.now(), correlationId: trace.correlationId, traceId: trace.traceId })
    return request
  },
  onResponse({ request, response, schemaPath, id }) {
    const s = started.get(id)
    started.delete(id)
    const durationMs = s ? Math.round(performance.now() - s.t0) : undefined
    const fields = {
      method: request.method,
      operation: schemaPath,
      status: response.status,
      durationMs,
      correlationId: response.headers.get('X-Correlation-Id') ?? s?.correlationId,
      traceId: s?.traceId,
    }
    if (response.ok) logger.info('api.request', fields)
    else logger.warn('api.request', fields)
    if (durationMs !== undefined) recordMetric('api.latency_ms', durationMs, { operation: schemaPath, status: response.status })
    return response
  },
  onError({ request, error, schemaPath, id }) {
    const s = started.get(id)
    started.delete(id)
    logger.error('api.request', {
      method: request.method,
      operation: schemaPath,
      status: 0,
      correlationId: s?.correlationId,
      traceId: s?.traceId,
      message: String(error),
    })
    return new ApiError(0, undefined, s?.correlationId)
  },
}

function baseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  return new URL(configured, origin).href.replace(/\/$/, '')
}

export const api = createClient<paths>({
  baseUrl: baseUrl(),
  // Resolve fetch lazily so MSW (tests) can patch it after this module is loaded.
  fetch: (input) => globalThis.fetch(input),
})
api.use(observability)

/** Unwraps an openapi-fetch result, throwing `ApiError`/`ConflictError` for non-2xx. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call
  if (response.ok && data !== undefined) return data
  const err = toApiError(response.status, error, response.headers.get('X-Correlation-Id') ?? undefined)
  track('api.error', { status: err.status, correlationId: err.correlationId, url: response.url })
  throw err
}
