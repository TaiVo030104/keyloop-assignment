import { HttpResponse, delay, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import { logger } from '@/observability/logger'
import { traceIdFrom } from '@/observability/correlation'
import { rollChaos } from './chaos'

export const API = '*/api'

export interface ProblemExtra {
  errors?: { field: string; message: string }[]
  [k: string]: unknown
}

const TYPES: Record<number, string> = {
  400: '/problems/bad-request',
  404: '/problems/not-found',
  409: '/problems/conflict',
  422: '/problems/business-rule',
  500: '/problems/internal',
}

export function problem(
  status: number,
  title: string,
  correlationId: string,
  detail?: string,
  extra: ProblemExtra = {},
): HttpResponse<DefaultBodyType> {
  return HttpResponse.json(
    { type: TYPES[status] ?? 'about:blank', title, status, detail, correlationId, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

export interface HandlerContext {
  correlationId: string
  traceId?: string
}

type Resolver<P extends PathParams> = (
  info: Parameters<HttpResponseResolver<P>>[0],
  ctx: HandlerContext,
) => Promise<HttpResponse<DefaultBodyType>> | HttpResponse<DefaultBodyType>

/**
 * Wraps a handler: correlation id echo, simulated latency/faults, structured log, 500 on
 * unexpected exceptions. Validation/404/409/422 come from the handler logic itself.
 */
export function handle<P extends PathParams = PathParams>(operation: string, resolver: Resolver<P>): HttpResponseResolver<P> {
  return async (info) => {
    const started = performance.now()
    const correlationId = info.request.headers.get('X-Correlation-Id') ?? crypto.randomUUID()
    const traceId = traceIdFrom(info.request.headers.get('traceparent'))
    const chaos = rollChaos()
    if (chaos.delayMs > 0) await delay(chaos.delayMs)

    let response: HttpResponse<DefaultBodyType>
    if (chaos.fail) {
      response = problem(500, 'Simulated server error', correlationId, 'Injected by the mock chaos settings.')
    } else {
      try {
        response = await resolver(info, { correlationId, traceId })
      } catch (err) {
        logger.error('mock.exception', { operation, correlationId, traceId, message: String(err) })
        response = problem(500, 'Internal server error', correlationId)
      }
    }
    response.headers.set('X-Correlation-Id', correlationId)
    logger.debug('mock.handled', {
      operation,
      status: response.status,
      correlationId,
      traceId,
      durationMs: Math.round(performance.now() - started),
    })
    return response
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}
