import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'

type A = { id: string; start: string; status: string; cancelledAt: string | null; customerName: string }

describe('GET /appointments (FR-015)', () => {
  it('lists a dealership local day ordered by start, including cancelled', async () => {
    const r = await call('GET', '/appointments?dealershipId=d-london&date=2026-11-04')
    expect(r.status).toBe(200)
    validateResponse('GET', '/appointments', 200, r.body)
    const list = r.body as A[]
    expect(list.map((a) => a.start)).toEqual([...list.map((a) => a.start)].sort())
    expect(list).toHaveLength(5)
    expect(list.filter((a) => a.status === 'CANCELLED')).toHaveLength(1)
  })

  it('filters by status and uses the dealership time zone for the day', async () => {
    const confirmed = (await call('GET', '/appointments?dealershipId=d-london&date=2026-11-04&status=CONFIRMED')).body as A[]
    expect(confirmed).toHaveLength(4)
    // Saigon 08:00 local on 11-04 is 01:00Z on 11-04 → belongs to Saigon local 2026-11-04
    const sgn = (await call('GET', '/appointments?dealershipId=d-saigon&date=2026-11-04')).body as A[]
    expect(sgn.map((a) => a.start)).toEqual(['2026-11-04T01:00:00Z', '2026-11-04T03:00:00Z'])
  })

  it('400 on missing/invalid params, 404 on unknown dealership', async () => {
    const bad = await call('GET', '/appointments?dealershipId=d-london&date=04-11-2026')
    expect(bad.status).toBe(400)
    validateResponse('GET', '/appointments', 400, bad.body)
    const missing = await call('GET', '/appointments?date=2026-11-04')
    expect(missing.status).toBe(400)
    const unknown = await call('GET', '/appointments?dealershipId=x&date=2026-11-04')
    expect(unknown.status).toBe(404)
    validateResponse('GET', '/appointments', 404, unknown.body)
  })
})

describe('GET /appointments/{id}', () => {
  it('200 and 404', async () => {
    const ok = await call('GET', '/appointments/seed-apt-01')
    validateResponse('GET', '/appointments/{appointmentId}', 200, ok.body)
    const nf = await call('GET', '/appointments/nope')
    expect(nf.status).toBe(404)
    validateResponse('GET', '/appointments/{appointmentId}', 404, nf.body)
  })
})

describe('POST /appointments/{id}/cancel (FR-016)', () => {
  it('cancels idempotently and frees the slot', async () => {
    // seed-apt-04 = EV 13:00–15:00 with the only EV technician
    const before = await call('POST', '/availability/check', {
      body: { dealershipId: 'd-london', serviceTypeId: 'st-ev', start: '2026-11-04T13:00:00Z' },
    })
    expect(before.body).toMatchObject({ available: false })

    const r = await call('POST', '/appointments/seed-apt-04/cancel')
    expect(r.status).toBe(200)
    validateResponse('POST', '/appointments/{appointmentId}/cancel', 200, r.body)
    expect(r.body).toMatchObject({ status: 'CANCELLED', cancelledAt: '2026-11-03T09:00:00Z' })

    const again = await call('POST', '/appointments/seed-apt-04/cancel')
    expect(again.status).toBe(200)
    expect(again.body).toEqual(r.body)

    const after = await call('POST', '/availability/check', {
      body: { dealershipId: 'd-london', serviceTypeId: 'st-ev', start: '2026-11-04T13:00:00Z' },
    })
    expect(after.body).toMatchObject({ available: true, technician: { id: 'lon-t-isla' } })
  })

  it('404 for unknown id', async () => {
    const r = await call('POST', '/appointments/nope/cancel')
    expect(r.status).toBe(404)
    validateResponse('POST', '/appointments/{appointmentId}/cancel', 404, r.body)
  })
})

describe('chaos: simulated 500', () => {
  it('fail-next returns a contract-valid 500 once', async () => {
    const { setChaos } = await import('@/mocks/chaos')
    setChaos({ failNext: true })
    const r = await call('GET', '/dealerships')
    expect(r.status).toBe(500)
    validateResponse('GET', '/dealerships', 500, r.body)
    expect((await call('GET', '/dealerships')).status).toBe(200)
  })
})
