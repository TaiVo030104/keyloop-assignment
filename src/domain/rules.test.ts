import { describe, expect, it } from 'vitest'
import { BAYS, LONDON, ST, TECHS, appt } from './fixtures.testutil'
import { isBayCompatible, isOpenDay, isQualified, isResourceFree, isWithinOpeningHours } from './rules'

const w = (start: string, end: string) => ({ start, end })
const tech = (id: string) => TECHS.find((t) => t.id === id)!
const bay = (id: string) => BAYS.find((b) => b.id === id)!

describe('isWithinOpeningHours (London 08:00–18:00)', () => {
  it.each([
    ['starts exactly at open', '2026-11-04T08:00:00Z', '2026-11-04T09:00:00Z', true],
    ['ends exactly at close', '2026-11-04T16:30:00Z', '2026-11-04T18:00:00Z', true],
    ['starts before open', '2026-11-04T07:45:00Z', '2026-11-04T08:45:00Z', false],
    ['ends after close', '2026-11-04T17:00:00Z', '2026-11-04T18:30:00Z', false],
    ['ends one minute after close', '2026-11-04T17:01:00Z', '2026-11-04T18:01:00Z', false],
    ['spans midnight', '2026-11-04T23:00:00Z', '2026-11-05T09:00:00Z', false],
  ])('%s', (_n, start, end, expected) => {
    expect(isWithinOpeningHours(LONDON, w(start, end))).toBe(expected)
  })
})

describe('isOpenDay', () => {
  it('Wednesday open, Sunday closed', () => {
    expect(isOpenDay(LONDON, '2026-11-04T10:00:00Z')).toBe(true)
    expect(isOpenDay(LONDON, '2026-11-08T10:00:00Z')).toBe(false)
  })
})

describe('isQualified', () => {
  it('requires the skill', () => {
    expect(isQualified(tech('t-bob'), ST.brakes!, 3)).toBe(true)
    expect(isQualified(tech('t-alice'), ST.brakes!, 3)).toBe(false)
  })
  it('requires a working day', () => {
    expect(isQualified(tech('t-alice'), ST.oil!, 5)).toBe(true)
    expect(isQualified(tech('t-alice'), ST.oil!, 6)).toBe(false)
  })
})

describe('isBayCompatible', () => {
  it('requires matching type', () => {
    expect(isBayCompatible(bay('b-1'), ST.oil!)).toBe(true)
    expect(isBayCompatible(bay('b-ev'), ST.oil!)).toBe(false)
    expect(isBayCompatible(bay('b-ev'), ST.ev!)).toBe(true)
  })
  it('never an inactive bay', () => {
    expect(isBayCompatible(bay('b-off'), ST.oil!)).toBe(false)
  })
})

describe('isResourceFree', () => {
  const window = w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z')
  const existing = appt({ start: '2026-11-04T10:30:00Z', end: '2026-11-04T11:30:00Z', technicianId: 't-bob', bayId: 'b-1' })

  it('busy when an overlapping CONFIRMED appointment uses the technician', () => {
    expect(isResourceFree('technician', 't-bob', window, [existing])).toBe(false)
  })
  it('busy when an overlapping CONFIRMED appointment uses the bay', () => {
    expect(isResourceFree('bay', 'b-1', window, [existing])).toBe(false)
  })
  it('free when the appointment uses other resources', () => {
    expect(isResourceFree('technician', 't-alice', window, [existing])).toBe(true)
    expect(isResourceFree('bay', 'b-2', window, [existing])).toBe(true)
  })
  it('cancelled appointments never block', () => {
    const cancelled = { ...existing, status: 'CANCELLED' as const, cancelledAt: '2026-11-03T08:00:00Z' }
    expect(isResourceFree('technician', 't-bob', window, [cancelled])).toBe(true)
  })
  it('back-to-back is free', () => {
    const before = appt({ start: '2026-11-04T09:00:00Z', end: '2026-11-04T10:00:00Z', technicianId: 't-bob', bayId: 'b-1' })
    const after = appt({ start: '2026-11-04T11:00:00Z', end: '2026-11-04T12:00:00Z', technicianId: 't-bob', bayId: 'b-1' })
    expect(isResourceFree('technician', 't-bob', window, [before, after])).toBe(true)
    expect(isResourceFree('bay', 'b-1', window, [before, after])).toBe(true)
  })
})
