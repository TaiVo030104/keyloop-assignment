import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'
import { booking, key } from './fixtures'

const P = '/appointments'

describe('POST /appointments (US1, FR-011, FR-012)', () => {
  it('201 with AppointmentView, Location and reference; persisted', async () => {
    const r = await call('POST', P, { body: booking(), headers: { 'Idempotency-Key': key() } })
    expect(r.status).toBe(201)
    validateResponse('POST', P, 201, r.body)
    const a = r.body as { id: string; reference: string; status: string; end: string; technicianName: string }
    expect(a).toMatchObject({ status: 'CONFIRMED', end: '2026-11-04T16:30:00Z', technicianName: 'George Patel' })
    expect(a.reference).toMatch(/^APT-20261104-[A-Z0-9]{4}$/)
    expect(r.headers.get('Location')).toBe(`/api/appointments/${a.id}`)

    const again = await call('GET', `/appointments/${a.id}`)
    expect(again.body).toEqual(a)
  })

  it('missing Idempotency-Key → 400', async () => {
    const r = await call('POST', P, { body: booking() })
    expect(r.status).toBe(400)
    validateResponse('POST', P, 400, r.body)
  })

  it('unknown vehicle → 404', async () => {
    const r = await call('POST', P, { body: booking({ vehicleId: 'nope' }), headers: { 'Idempotency-Key': key() } })
    expect(r.status).toBe(404)
    validateResponse('POST', P, 404, r.body)
  })

  it.each([
    ['vehicle of another customer', { vehicleId: 'v-02a' }],
    ['start in the past', { start: '2026-11-02T10:00:00Z' }],
    ['outside opening hours', { start: '2026-11-04T17:00:00Z' }],
    ['unqualified technician', { technicianId: 'lon-t-isla' }],
  ])('business-rule violation (%s) → 422', async (_n, over) => {
    const r = await call('POST', P, { body: booking(over), headers: { 'Idempotency-Key': key() } })
    expect(r.status).toBe(422)
    validateResponse('POST', P, 422, r.body)
  })
})
