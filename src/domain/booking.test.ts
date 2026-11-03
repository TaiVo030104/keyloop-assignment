import { describe, expect, it } from 'vitest'
import { BAYS, NOW, ST, TECHS, appt, ctx } from './fixtures.testutil'
import { buildAppointment, decideBooking, makeReference, toAppointmentView } from './booking'
import type { Vehicle } from './types'

const vehicle: Vehicle = { id: 'v-1', customerId: 'c-1', vin: 'JTDBR32E720123456', make: 'Toyota', model: 'Corolla', year: 2022 }
const base = {
  customerId: 'c-1',
  vehicleId: 'v-1',
  start: '2026-11-04T10:00:00Z',
  technicianId: 't-bob',
  bayId: 'b-1',
}

describe('decideBooking (FR-011)', () => {
  it('ok when the reviewed technician and bay are still free', () => {
    expect(decideBooking({ ctx: ctx(ST.brakes!), request: base, vehicle }, NOW)).toEqual({
      outcome: 'ok',
      window: { start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:30:00Z' },
      technician: { id: 't-bob', name: 'Bob' },
      bay: { id: 'b-1', name: 'Bay 1' },
    })
  })

  it('invalid when the vehicle does not belong to the customer', () => {
    const r = decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, customerId: 'c-2' }, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid', errors: [{ field: 'vehicleId' }] })
  })

  it('invalid when start is not on a 15-minute boundary', () => {
    const r = decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, start: '2026-11-04T10:10:00Z' }, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid', errors: [{ field: 'start' }] })
  })

  it('invalid when resources do not belong to the dealership', () => {
    const r = decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, technicianId: 't-nope', bayId: 'b-nope' }, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid', errors: [{ field: 'technicianId' }, { field: 'bayId' }] })
  })

  it.each([
    ['START_IN_PAST', '2026-11-02T10:00:00Z'],
    ['OUTSIDE_OPENING_HOURS', '2026-11-04T17:00:00Z'],
    ['DEALERSHIP_CLOSED', '2026-11-08T10:00:00Z'],
  ])('invalid with reason %s', (reason, start) => {
    const r = decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, start }, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid', reason })
  })

  it('invalid when the service is not offered', () => {
    const r = decideBooking({ ctx: ctx(ST.tyre!), request: base, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'invalid', reason: 'SERVICE_NOT_OFFERED' })
  })

  it('invalid when the proposed technician lacks the skill or the bay is incompatible', () => {
    expect(decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, technicianId: 't-alice' }, vehicle }, NOW)).toMatchObject({
      outcome: 'invalid',
      errors: [{ field: 'technicianId' }],
    })
    expect(decideBooking({ ctx: ctx(ST.brakes!), request: { ...base, bayId: 'b-ev' }, vehicle }, NOW)).toMatchObject({
      outcome: 'invalid',
      errors: [{ field: 'bayId' }],
    })
  })

  it('conflict PROPOSED_RESOURCE_TAKEN with requested start first when other resources are free', () => {
    const taken = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:00:00Z', technicianId: 't-alice', bayId: 'b-1' })
    const r = decideBooking({ ctx: ctx(ST.oil!, [taken]), request: { ...base, technicianId: 't-bob', bayId: 'b-1' }, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'conflict', reason: 'PROPOSED_RESOURCE_TAKEN' })
    expect(r.outcome === 'conflict' && r.alternatives[0]).toBe('2026-11-04T10:00:00Z')
  })

  it('conflict with the real reason when the slot is gone entirely', () => {
    const taken = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:30:00Z', technicianId: 't-bob', bayId: 'b-2' })
    const r = decideBooking({ ctx: ctx(ST.brakes!, [taken]), request: base, vehicle }, NOW)
    expect(r).toMatchObject({ outcome: 'conflict', reason: 'NO_QUALIFIED_TECHNICIAN' })
    expect(r.outcome === 'conflict' && r.alternatives).not.toContain('2026-11-04T10:00:00Z')
  })

  it('a cancelled appointment for the same resources does not conflict', () => {
    const cancelled = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:30:00Z', technicianId: 't-bob', bayId: 'b-1', status: 'CANCELLED' })
    expect(decideBooking({ ctx: ctx(ST.brakes!, [cancelled]), request: base, vehicle }, NOW).outcome).toBe('ok')
  })
})

describe('makeReference / buildAppointment (FR-012)', () => {
  it('reference uses the dealership-local start date and 4 uppercase alphanumerics', () => {
    const seq = [0, 0.5, 0.99, 0.1]
    let i = 0
    const ref = makeReference('2026-11-04T23:30:00Z', 'Asia/Ho_Chi_Minh', () => seq[i++ % seq.length]!)
    expect(ref).toMatch(/^APT-20261105-[A-Z0-9]{4}$/)
  })

  it('builds a CONFIRMED appointment with createdAt = now', () => {
    const a = buildAppointment({
      id: 'id-1',
      reference: 'APT-20261104-AB12',
      request: { ...base, dealershipId: 'd-lon', serviceTypeId: 'st-brakes' },
      window: { start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:30:00Z' },
      now: NOW,
    })
    expect(a).toEqual({
      id: 'id-1',
      reference: 'APT-20261104-AB12',
      status: 'CONFIRMED',
      customerId: 'c-1',
      vehicleId: 'v-1',
      dealershipId: 'd-lon',
      serviceTypeId: 'st-brakes',
      technicianId: 't-bob',
      bayId: 'b-1',
      start: '2026-11-04T10:00:00Z',
      end: '2026-11-04T11:30:00Z',
      createdAt: NOW,
      cancelledAt: null,
    })
  })

  it('toAppointmentView denormalises display fields', () => {
    const a = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:00:00Z' })
    const v = toAppointmentView(a, {
      customer: { id: 'c-1', firstName: 'Jane', lastName: 'Smith', phone: '+44', email: 'j@x.test' },
      vehicle,
      serviceType: ST.oil!,
      technician: TECHS[0]!,
      bay: BAYS[1]!,
    })
    expect(v).toMatchObject({
      customerName: 'Jane Smith',
      vehicleLabel: '2022 Toyota Corolla · JTDBR32E720123456',
      serviceTypeName: 'Oil change',
      technicianName: 'Bob',
      bayName: 'Bay 1',
    })
  })
})

describe('cancelAppointment (FR-016, state machine)', () => {
  it('CONFIRMED → CANCELLED with cancelledAt; cancelling again is a no-op', async () => {
    const { cancelAppointment } = await import('./booking')
    const a = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:00:00Z' })
    const c = cancelAppointment(a, NOW)
    expect(c).toMatchObject({ status: 'CANCELLED', cancelledAt: NOW })
    expect(cancelAppointment(c, '2026-11-03T10:00:00Z')).toBe(c)
  })
})
