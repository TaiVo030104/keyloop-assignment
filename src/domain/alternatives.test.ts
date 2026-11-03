import { describe, expect, it } from 'vitest'
import { NOW, SAIGON, ST, appt, ctx } from './fixtures.testutil'
import { findAlternatives } from './alternatives'
import { evaluateSlot } from './availability'
import { isAlignedTo15InZone, toMs } from './time'

describe('findAlternatives (FR-008, research R9)', () => {
  it('returns at most `limit` slots ordered by distance, ties earlier first', () => {
    const busy = appt({ start: '2026-11-04T10:00:00Z', end: '2026-11-04T12:00:00Z', technicianId: 't-eve', bayId: 'b-x' })
    const c = ctx(ST.ev!, [busy])
    const alts = findAlternatives(c, '2026-11-04T10:30:00Z', NOW)
    expect(alts).toHaveLength(5)
    const d = alts.map((a) => Math.abs(toMs(a) - toMs('2026-11-04T10:30:00Z')))
    expect([...d].sort((a, b) => a - b)).toEqual(d)
    expect(findAlternatives(c, '2026-11-04T10:30:00Z', NOW, { limit: 2 })).toEqual(['2026-11-04T12:00:00Z', '2026-11-04T12:15:00Z'])
  })

  it('every returned slot is on the 15-minute grid and actually bookable', () => {
    const busy = appt({ start: '2026-11-04T08:00:00Z', end: '2026-11-04T18:00:00Z', technicianId: 't-eve', bayId: 'b-x' })
    const c = ctx(ST.ev!, [busy])
    const alts = findAlternatives(c, '2026-11-04T10:30:00Z', NOW)
    expect(alts.length).toBeGreaterThan(0)
    for (const a of alts) {
      expect(isAlignedTo15InZone(a, 'Europe/London')).toBe(true)
      expect(evaluateSlot(c, a, NOW).ok).toBe(true)
    }
    // Search starts on the requested day (R9): whole Wednesday blocked → Thursday opening
    expect(alts[0]).toBe('2026-11-05T08:00:00Z')
  })

  it('window ending after close → earlier same-day and next-day slots', () => {
    const alts = findAlternatives(ctx(ST.brakes!), '2026-11-04T17:00:00Z', NOW)
    expect(alts).toEqual([
      '2026-11-04T16:30:00Z',
      '2026-11-04T16:15:00Z',
      '2026-11-04T16:00:00Z',
      '2026-11-04T15:45:00Z',
      '2026-11-04T15:30:00Z',
    ])
  })

  it('never suggests a start in the past or at now', () => {
    const alts = findAlternatives(ctx(ST.oil!), '2026-11-03T08:00:00Z', NOW)
    expect(alts[0]).toBe('2026-11-03T09:15:00Z')
    for (const a of alts) expect(toMs(a)).toBeGreaterThan(toMs(NOW))
  })

  it('skips closed days (Sunday request → Monday opening is nearest)', () => {
    const alts = findAlternatives(ctx(ST.oil!), '2026-11-08T10:00:00Z', NOW)
    expect(alts[0]).toBe('2026-11-09T08:00:00Z')
    for (const a of alts) expect(new Date(a).getUTCDay()).not.toBe(0)
  })

  it('stays within the 7-day horizon and returns [] when nothing fits', () => {
    const blockAll = Array.from({ length: 10 }, (_, i) =>
      appt({
        start: `2026-11-${String(3 + i).padStart(2, '0')}T00:00:00Z`,
        end: `2026-11-${String(4 + i).padStart(2, '0')}T00:00:00Z`,
        technicianId: 't-eve',
        bayId: 'b-x',
      }),
    )
    expect(findAlternatives(ctx(ST.ev!, blockAll), '2026-11-04T10:00:00Z', NOW)).toEqual([])

    // Free only on day 8 → outside horizon → []
    const freeLater = blockAll.slice(0, 8)
    const alts = findAlternatives(ctx(ST.ev!, freeLater), '2026-11-04T10:00:00Z', NOW)
    for (const a of alts) expect(toMs(a) - toMs('2026-11-04T10:00:00Z')).toBeLessThanOrEqual(7 * 24 * 3600_000)
  })

  it('works in a non-UTC zone (Saigon 07:30 opening)', () => {
    const c = ctx(ST.oil!, [], {
      dealership: SAIGON,
      technicians: [{ id: 't-s', dealershipId: 'd-sgn', name: 'Son', skills: ['GENERAL_MAINTENANCE'], workingDays: [1, 2, 3, 4, 5, 6] }],
      bays: [{ id: 'b-s', dealershipId: 'd-sgn', name: 'S1', type: 'GENERAL', active: true }],
    })
    // Request 07:00 local (before opening) Wed → 07:30 local = 00:30Z is the nearest
    expect(findAlternatives(c, '2026-11-04T00:00:00Z', NOW)[0]).toBe('2026-11-04T00:30:00Z')
  })

  it('returns [] for a service the dealership does not offer', () => {
    expect(findAlternatives(ctx(ST.tyre!), '2026-11-04T10:00:00Z', NOW)).toEqual([])
  })
})
