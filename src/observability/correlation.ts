/** Correlation ids and W3C Trace Context (`traceparent`) generation. */

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface TraceContext {
  traceId: string
  spanId: string
  traceparent: string
  correlationId: string
}

export function newTraceContext(): TraceContext {
  const traceId = randomHex(16)
  const spanId = randomHex(8)
  return {
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`,
    correlationId: crypto.randomUUID(),
  }
}

/** Extracts the trace id from a `traceparent` header, if well formed. */
export function traceIdFrom(traceparent: string | null | undefined): string | undefined {
  const m = traceparent?.match(/^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/)
  return m?.[1]
}
