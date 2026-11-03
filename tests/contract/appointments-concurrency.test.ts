import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'
import { booking, key } from './fixtures'

const P = '/appointments'
const ev = (over: Record<string, unknown> = {}) =>
  booking({ serviceTypeId: 'st-ev', start: '2026-11-04T15:00:00Z', technicianId: 'lon-t-isla', bayId: 'lon-bay-ev', ...over })

async function countAt(start: string) {
  const list = (await call('GET', '/appointments?dealershipId=d-london&date=2026-11-04&status=CONFIRMED')).body as { start: string }[]
  return list.filter((a) => a.start === start).length
}

describe('No double-booking (US3, FR-011, FR-014)', () => {
  it('two parallel confirms for the last EV slot → one 201, one 409 with alternatives', async () => {
    const [a, b] = await Promise.all([
      call('POST', P, { body: ev(), headers: { 'Idempotency-Key': key() } }),
      call('POST', P, { body: ev({ customerId: 'c-03', vehicleId: 'v-03a' }), headers: { 'Idempotency-Key': key() } }),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    const conflict = a.status === 409 ? a : b
    validateResponse('POST', P, 409, conflict.body)
    expect(conflict.body).toMatchObject({ reason: 'NO_QUALIFIED_TECHNICIAN' })
    expect((conflict.body as { alternatives: string[] }).alternatives.length).toBeGreaterThan(0)
    expect(await countAt('2026-11-04T15:00:00Z')).toBe(1)
  })

  it('reviewed technician taken but slot still bookable → PROPOSED_RESOURCE_TAKEN, requested start first', async () => {
    const oil = { serviceTypeId: 'st-oil', start: '2026-11-04T15:00:00Z', technicianId: 'lon-t-oliver', bayId: 'lon-bay-1' }
    expect((await call('POST', P, { body: booking(oil), headers: { 'Idempotency-Key': key() } })).status).toBe(201)
    const r = await call('POST', P, { body: booking({ ...oil, customerId: 'c-03', vehicleId: 'v-03a' }), headers: { 'Idempotency-Key': key() } })
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ reason: 'PROPOSED_RESOURCE_TAKEN', alternatives: expect.arrayContaining(['2026-11-04T15:00:00Z']) })
    expect((r.body as { alternatives: string[] }).alternatives[0]).toBe('2026-11-04T15:00:00Z')
  })

  it('same Idempotency-Key + same body → replay of the original 201 (double click / retry)', async () => {
    const k = key()
    const [a, b] = await Promise.all([
      call('POST', P, { body: ev(), headers: { 'Idempotency-Key': k } }),
      call('POST', P, { body: ev(), headers: { 'Idempotency-Key': k } }),
    ])
    expect(a.status).toBe(201)
    expect(b.status).toBe(201)
    expect((a.body as { id: string }).id).toBe((b.body as { id: string }).id)
    expect([a.headers.get('Idempotent-Replayed'), b.headers.get('Idempotent-Replayed')]).toContain('true')
    expect(await countAt('2026-11-04T15:00:00Z')).toBe(1)
  })

  it('same Idempotency-Key + different body → 422', async () => {
    const k = key()
    expect((await call('POST', P, { body: ev(), headers: { 'Idempotency-Key': k } })).status).toBe(201)
    const r = await call('POST', P, { body: ev({ start: '2026-11-04T08:00:00Z' }), headers: { 'Idempotency-Key': k } })
    expect(r.status).toBe(422)
    validateResponse('POST', P, 422, r.body)
  })
})
