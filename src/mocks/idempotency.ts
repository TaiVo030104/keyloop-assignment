import type { DbState, IdempotencyRecord } from './store/SchedulerStore'

const RETENTION_MS = 24 * 3600_000

/** JSON with object keys sorted, so the hash ignores property order. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** FNV-1a 32-bit hash of the stable JSON body — enough to detect key reuse with another body. */
export function hashRequest(body: unknown): string {
  const s = stableStringify(body)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function findRecord(db: DbState, key: string): IdempotencyRecord | undefined {
  return db.idempotency.find((r) => r.key === key)
}

export function pruneRecords(db: DbState, nowMs: number): DbState {
  return { ...db, idempotency: db.idempotency.filter((r) => nowMs - Date.parse(r.createdAt) < RETENTION_MS) }
}
