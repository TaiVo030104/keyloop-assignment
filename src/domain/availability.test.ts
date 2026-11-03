import { describe, expect, it } from 'vitest'
import { NOW, ST, TECHS, appt, ctx } from './fixtures.testutil'
import { checkAvailability, evaluateSlot } from './availability'

describe('checkAvailability — available (US1, FR-004, FR-005, FR-009)', () => {
  it('90-minute service at 10:00 is available with end 11:30 and proposed resources', () => {
    const r = checkAvailability(ctx(ST.brakes!), '2026-11-04T10:00:00Z', NOW)
    expect(r).toEqual({
      available: true,
      window: { start: '2026-11-04T10:00:00Z', end: '2026-11-04T11:30:00Z' },
      technician: { id: 't-bob', name: 'Bob' },
      bay: { id: 'b-1', name: 'Bay 1' },
    })
  })

  it('back-to-back with an existing booking is available', () => {
    const before = appt({ start: '2026-11-04T08:30:00Z', end: '2026-11-04T10:00:00Z', technicianId: 't-bob', bayId: 'b-1' })
    const r = checkAvailability(ctx(ST.brakes!, [before]), '2026-11-04T10:00:00Z', NOW)
    expect(r.available).toBe(true)
  })

  it('a cancelled booking never blocks', () => {
    const cancelled = appt({
      start: '2026-11-04T10:00:00Z',
      end: '2026-11-04T11:30:00Z',
      technicianId: 't-bob',
      status: 'CANCELLED',
    })
    expect(checkAvailability(ctx(ST.brakes!, [cancelled]), '2026-11-04T10:00:00Z', NOW).available).toBe(true)
  })
})

describe('checkAvailability — unavailable reasons and precedence (FR-007)', () => {
  it.each([
    ['SERVICE_NOT_OFFERED beats past start', ST.tyre!, '2026-11-02T10:00:00Z', 'SERVICE_NOT_OFFERED'],
    ['START_IN_PAST beats closed day', ST.oil!, '2026-11-01T10:00:00Z', 'START_IN_PAST'],
    ['start exactly now is in the past', ST.oil!, NOW, 'START_IN_PAST'],
    ['DEALERSHIP_CLOSED beats outside hours (Sunday 20:00)', ST.oil!, '2026-11-08T20:00:00Z', 'DEALERSHIP_CLOSED'],
    ['OUTSIDE_OPENING_HOURS when ending after close', ST.brakes!, '2026-11-04T17:00:00Z', 'OUTSIDE_OPENING_HOURS'],
    ['OUTSIDE_OPENING_HOURS when starting before open', ST.oil!, '2026-11-04T07:30:00Z', 'OUTSIDE_OPENING_HOURS'],
  ])('%s', (_n, st, start, reason) => {
    const r = checkAvailability(ctx(st), start, NOW)
    expect(r.available).toBe(false)
    expect(!r.available && r.reason).toBe(reason)
  })

  it('NO_QUALIFIED_TECHNICIAN beats NO_COMPATIBLE_BAY', () => {
    const r = evaluateSlot(ctx(ST.ev!, [], { technicians: [], bays: [] }), '2026-11-04T10:00:00Z', NOW)
    expect(r).toMatchObject({ ok: false, reason: 'NO_QUALIFIED_TECHNICIAN' })
  })

  it('SERVICE_NOT_OFFERED has no alternatives', () => {
    const r = checkAvailability(ctx(ST.tyre!), '2026-11-04T10:00:00Z', NOW)
    expect(r).toEqual({
      available: false,
      window: { start: '2026-11-04T10:00:00Z', end: '2026-11-04T10:30:00Z' },
      reason: 'SERVICE_NOT_OFFERED',
      alternatives: [],
    })
  })
})

describe('checkAvailability — alternatives (US2)', () => {
  it('only EV technician busy 10:00–12:00, EV check at 10:30 → nearest five', () => {
    const busy = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T12:00:00Z', technicianId: 't-eve', bayId: 'b-x', serviceTypeId: 'st-ev' })
    const r = checkAvailability(ctx(ST.ev!, [busy]), '2026-11-04T10:30:00Z', NOW)
    expect(r).toEqual({
      available: false,
      window: { start: '2026-11-04T10:30:00Z', end: '2026-11-04T12:30:00Z' },
      reason: 'NO_QUALIFIED_TECHNICIAN',
      alternatives: [
        '2026-11-04T12:00:00Z',
        '2026-11-04T12:15:00Z',
        '2026-11-04T12:30:00Z',
        '2026-11-04T12:45:00Z',
        '2026-11-04T08:00:00Z', // tie with 13:00 at 150 min → earlier first
      ],
    })
  })

  it('no qualified technician at all → explicit empty list', () => {
    const r = checkAvailability(ctx(ST.ev!, [], { technicians: TECHS.filter((t) => t.id !== 't-eve') }), '2026-11-04T10:00:00Z', NOW)
    expect(r).toMatchObject({ available: false, reason: 'NO_QUALIFIED_TECHNICIAN', alternatives: [] })
  })
})
