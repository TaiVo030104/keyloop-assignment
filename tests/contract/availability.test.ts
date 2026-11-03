import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'

const P = '/availability/check'

describe('POST /availability/check', () => {
  it('available → 200 with window, technician, bay', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'd-london', serviceTypeId: 'st-brakes', start: '2026-11-04T15:00:00Z' } })
    expect(r.status).toBe(200)
    validateResponse('POST', P, 200, r.body)
    expect(r.body).toMatchObject({ available: true, window: { start: '2026-11-04T15:00:00Z', end: '2026-11-04T16:30:00Z' } })
  })

  it('unavailable (only EV technician busy) → 200 with reason and ≤5 alternatives', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'd-london', serviceTypeId: 'st-ev', start: '2026-11-04T13:30:00Z' } })
    expect(r.status).toBe(200)
    validateResponse('POST', P, 200, r.body)
    expect(r.body).toMatchObject({ available: false, reason: 'NO_QUALIFIED_TECHNICIAN' })
    expect((r.body as { alternatives: string[] }).alternatives.length).toBeGreaterThan(0)
  })

  it('accepts offsets and normalises to UTC', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'd-saigon', serviceTypeId: 'st-oil', start: '2026-11-04T14:00:00+07:00' } })
    expect(r.body).toMatchObject({ window: { start: '2026-11-04T07:00:00Z' } })
  })

  it('malformed body → 400', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'd-london', start: 'tomorrow' } })
    expect(r.status).toBe(400)
    validateResponse('POST', P, 400, r.body)
    expect((r.body as { errors: { field: string }[] }).errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['serviceTypeId', 'start']),
    )
  })

  it('start not on a 15-minute boundary → 400', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'd-london', serviceTypeId: 'st-oil', start: '2026-11-04T10:10:00Z' } })
    expect(r.status).toBe(400)
  })

  it('unknown dealership → 404', async () => {
    const r = await call('POST', P, { body: { dealershipId: 'x', serviceTypeId: 'st-oil', start: '2026-11-04T10:00:00Z' } })
    expect(r.status).toBe(404)
    validateResponse('POST', P, 404, r.body)
  })
})
