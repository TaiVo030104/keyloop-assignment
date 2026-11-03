import { describe, expect, it } from 'vitest'
import { BAYS, ST, TECHS, appt, ctx } from './fixtures.testutil'
import { countConfirmedOnDay, findAssignment, pickLeastBooked } from './assignment'

const w = (start: string, end: string) => ({ start, end })
const WED_10 = w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z')

describe('pickLeastBooked', () => {
  it('fewest wins, ties by name then id', () => {
    const c = [
      { id: 'x2', name: 'Zed' },
      { id: 'x3', name: 'Amy' },
      { id: 'x1', name: 'Amy' },
    ]
    expect(pickLeastBooked(c, () => 0)?.id).toBe('x1')
    expect(pickLeastBooked(c, (r) => (r.name === 'Amy' ? 2 : 1))?.id).toBe('x2')
    expect(pickLeastBooked([], () => 0)).toBeUndefined()
  })
})

describe('countConfirmedOnDay', () => {
  it('counts only CONFIRMED appointments on that local day for that resource', () => {
    const list = [
      appt({ start: '2026-11-04T08:00:00Z', end: '2026-11-04T09:00:00Z', technicianId: 't-bob' }),
      appt({ start: '2026-11-04T15:00:00Z', end: '2026-11-04T16:00:00Z', technicianId: 't-bob', status: 'CANCELLED' }),
      appt({ start: '2026-11-05T08:00:00Z', end: '2026-11-05T09:00:00Z', technicianId: 't-bob' }),
      appt({ start: '2026-11-04T12:00:00Z', end: '2026-11-04T13:00:00Z', technicianId: 't-alice' }),
    ]
    expect(countConfirmedOnDay('technician', 't-bob', '2026-11-04', 'Europe/London', list)).toBe(1)
    expect(countConfirmedOnDay('bay', 'b-1', '2026-11-04', 'Europe/London', list)).toBe(2)
  })
})

describe('findAssignment (FR-005, FR-010)', () => {
  it('picks least-booked qualified technician, tie by name (Alice before Bob)', () => {
    const r = findAssignment(ctx(ST.oil!), WED_10)
    expect(r).toEqual({ ok: true, assignment: { technician: { id: 't-alice', name: 'Alice' }, bay: { id: 'b-1', name: 'Bay 1' } } })
  })

  it('balances workload: Alice has a booking that day so Bob is chosen; Bay 1 busier so Bay 2', () => {
    const other = appt({ start: '2026-11-04T14:00:00Z', end: '2026-11-04T15:00:00Z', technicianId: 't-alice', bayId: 'b-1' })
    const r = findAssignment(ctx(ST.oil!, [other]), WED_10)
    expect(r.ok && r.assignment.technician.id).toBe('t-bob')
    expect(r.ok && r.assignment.bay.id).toBe('b-2')
  })

  it('cancelled appointments do not count towards workload', () => {
    const other = appt({ start: '2026-11-04T14:00:00Z', end: '2026-11-04T15:00:00Z', technicianId: 't-alice', status: 'CANCELLED' })
    const r = findAssignment(ctx(ST.oil!, [other]), WED_10)
    expect(r.ok && r.assignment.technician.id).toBe('t-alice')
  })

  it('never assigns a free technician lacking the skill', () => {
    // Brakes: only Bob has BRAKES. Bob busy → no qualified technician even though Alice is free.
    const busy = appt({ start: '2026-11-04T10:30:00Z', end: '2026-11-04T11:00:00Z', technicianId: 't-bob', bayId: 'b-2' })
    expect(findAssignment(ctx(ST.brakes!, [busy]), w('2026-11-04T10:00:00Z', '2026-11-04T11:30:00Z'))).toEqual({
      ok: false,
      reason: 'NO_QUALIFIED_TECHNICIAN',
    })
  })

  it('never assigns a technician not working that weekday (Alice off on Saturday)', () => {
    const busyBob = appt({ start: '2026-11-07T10:00:00Z', end: '2026-11-07T11:00:00Z', technicianId: 't-bob', bayId: 'b-2' })
    const r = findAssignment(ctx(ST.oil!, [busyBob]), w('2026-11-07T10:00:00Z', '2026-11-07T11:00:00Z'))
    expect(r).toEqual({ ok: false, reason: 'NO_QUALIFIED_TECHNICIAN' })
  })

  it('never assigns a free bay of the wrong type or an inactive bay', () => {
    const busyEvBay = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T12:00:00Z', technicianId: 't-x', bayId: 'b-ev' })
    expect(findAssignment(ctx(ST.ev!, [busyEvBay]), w('2026-11-04T10:00:00Z', '2026-11-04T12:00:00Z'))).toEqual({
      ok: false,
      reason: 'NO_COMPATIBLE_BAY',
    })
    const onlyInactive = ctx(ST.oil!, [], { bays: BAYS.filter((b) => b.id === 'b-off') })
    expect(findAssignment(onlyInactive, WED_10)).toEqual({ ok: false, reason: 'NO_COMPATIBLE_BAY' })
  })

  it('ignores resources of other dealerships', () => {
    const foreign = ctx(ST.oil!, [], {
      technicians: TECHS.map((t) => ({ ...t, dealershipId: 'd-sgn' })),
    })
    expect(findAssignment(foreign, WED_10)).toEqual({ ok: false, reason: 'NO_QUALIFIED_TECHNICIAN' })
  })
})
