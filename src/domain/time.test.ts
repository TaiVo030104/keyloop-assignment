import { describe, expect, it } from 'vitest'
import {
  addLocalDays,
  addMinutes,
  isAlignedTo15InZone,
  isoWeekdayInZone,
  localDate,
  localDayBounds,
  localTime,
  overlaps,
  toInstant,
  zonedToInstant,
} from './time'

const w = (start: string, end: string) => ({ start, end })

describe('overlaps (half-open [start, end))', () => {
  it.each([
    ['back-to-back after', w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), w('2026-11-04T11:00:00Z', '2026-11-04T12:00:00Z'), false],
    ['back-to-back before', w('2026-11-04T11:00:00Z', '2026-11-04T12:00:00Z'), w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), false],
    ['one-minute overlap', w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), w('2026-11-04T10:59:00Z', '2026-11-04T12:00:00Z'), true],
    ['containment', w('2026-11-04T10:00:00Z', '2026-11-04T12:00:00Z'), w('2026-11-04T10:30:00Z', '2026-11-04T11:00:00Z'), true],
    ['identical', w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), true],
    ['disjoint', w('2026-11-04T08:00:00Z', '2026-11-04T09:00:00Z'), w('2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), false],
  ])('%s', (_name, a, b, expected) => {
    expect(overlaps(a, b)).toBe(expected)
    expect(overlaps(b, a)).toBe(expected)
  })

  it('compares instants, not strings (millisecond formatting is irrelevant)', () => {
    expect(overlaps(w('2026-11-04T10:00:00.000Z', '2026-11-04T11:00:00.000Z'), w('2026-11-04T11:00:00Z', '2026-11-04T12:00:00Z'))).toBe(false)
  })
})

describe('instant helpers', () => {
  it('toInstant drops milliseconds', () => {
    expect(toInstant(Date.UTC(2026, 10, 4, 10, 0, 0))).toBe('2026-11-04T10:00:00Z')
  })
  it('addMinutes', () => {
    expect(addMinutes('2026-11-04T10:00:00Z', 90)).toBe('2026-11-04T11:30:00Z')
    expect(addMinutes('2026-11-04T23:30:00Z', 45)).toBe('2026-11-05T00:15:00Z')
  })
})

describe('zoned conversions', () => {
  it('London winter (GMT) local equals UTC', () => {
    expect(zonedToInstant('2026-11-04', '10:00', 'Europe/London')).toBe('2026-11-04T10:00:00Z')
  })
  it('London summer (BST) is UTC+1', () => {
    expect(zonedToInstant('2026-07-01', '10:00', 'Europe/London')).toBe('2026-07-01T09:00:00Z')
  })
  it('Saigon is UTC+7', () => {
    expect(zonedToInstant('2026-11-04', '07:30', 'Asia/Ho_Chi_Minh')).toBe('2026-11-04T00:30:00Z')
  })
  it('localDate / localTime round-trip, crossing the UTC date line', () => {
    const i = '2026-11-04T20:00:00Z'
    expect(localDate(i, 'Asia/Ho_Chi_Minh')).toBe('2026-11-05')
    expect(localTime(i, 'Asia/Ho_Chi_Minh')).toBe('03:00')
    expect(localDate(i, 'Europe/London')).toBe('2026-11-04')
  })
  it('isoWeekdayInZone (Mon=1 … Sun=7)', () => {
    expect(isoWeekdayInZone('2026-11-04T10:00:00Z', 'Europe/London')).toBe(3)
    expect(isoWeekdayInZone('2026-11-08T10:00:00Z', 'Europe/London')).toBe(7)
    // Sat 20:00 UTC is already Sunday in Saigon
    expect(isoWeekdayInZone('2026-11-07T20:00:00Z', 'Asia/Ho_Chi_Minh')).toBe(7)
  })
})

describe('DST transitions (Europe/London)', () => {
  it('spring forward day (2026-03-29) is 23 hours long', () => {
    const b = localDayBounds('2026-03-29', 'Europe/London')
    expect(b.start).toBe('2026-03-29T00:00:00Z')
    expect(b.end).toBe('2026-03-29T23:00:00Z')
    expect(zonedToInstant('2026-03-29', '10:00', 'Europe/London')).toBe('2026-03-29T09:00:00Z')
  })
  it('fall back day (2026-10-25) is 25 hours long', () => {
    const b = localDayBounds('2026-10-25', 'Europe/London')
    expect(b.start).toBe('2026-10-24T23:00:00Z')
    expect(b.end).toBe('2026-10-26T00:00:00Z')
    expect(zonedToInstant('2026-10-25', '10:00', 'Europe/London')).toBe('2026-10-25T10:00:00Z')
  })
})

describe('isAlignedTo15InZone', () => {
  it.each([
    ['2026-11-04T10:00:00Z', 'Europe/London', true],
    ['2026-11-04T10:45:00Z', 'Europe/London', true],
    ['2026-11-04T10:10:00Z', 'Europe/London', false],
    ['2026-11-04T10:15:30Z', 'Europe/London', false],
    ['2026-11-04T00:30:00Z', 'Asia/Ho_Chi_Minh', true],
  ])('%s in %s → %s', (i, tz, expected) => {
    expect(isAlignedTo15InZone(i, tz)).toBe(expected)
  })
})

describe('addLocalDays', () => {
  it('handles month and year boundaries', () => {
    expect(addLocalDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addLocalDays('2026-11-04', -4)).toBe('2026-10-31')
  })
})
