import { describe, expect, it } from 'vitest'
import { hashRequest, pruneRecords, stableStringify } from './idempotency'
import { createSeed } from './seed'

describe('idempotency helpers', () => {
  it('hash ignores key order but not values', () => {
    expect(hashRequest({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(hashRequest({ b: [1, { d: 3, c: 2 }], a: 1 }))
    expect(hashRequest({ a: 1 })).not.toBe(hashRequest({ a: 2 }))
    expect(stableStringify({ b: 1, a: undefined })).toBe('{"b":1}')
  })

  it('prunes records older than 24h', () => {
    const db = createSeed('2026-11-03T09:00:00Z')
    db.idempotency = [
      { key: 'old', requestHash: 'x', appointmentId: 'a', createdAt: '2026-11-01T00:00:00Z' },
      { key: 'new', requestHash: 'x', appointmentId: 'a', createdAt: '2026-11-03T08:00:00Z' },
    ]
    expect(pruneRecords(db, Date.parse('2026-11-03T09:00:00Z')).idempotency.map((r) => r.key)).toEqual(['new'])
  })
})
