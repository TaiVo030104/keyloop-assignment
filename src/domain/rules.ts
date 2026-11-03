import { isoWeekdayInZone, localDate, overlaps, toMs, zonedToInstant } from './time'
import type { Appointment, Dealership, Instant, ServiceBay, ServiceType, Technician, TimeWindow } from './types'

export function isOpenDay(dealership: Dealership, start: Instant): boolean {
  return dealership.openDays.includes(isoWeekdayInZone(start, dealership.timeZone))
}

/** Whole window inside the opening hours of the local day it starts on. */
export function isWithinOpeningHours(dealership: Dealership, window: TimeWindow): boolean {
  const day = localDate(window.start, dealership.timeZone)
  const open = zonedToInstant(day, dealership.openingHours.open, dealership.timeZone)
  const close = zonedToInstant(day, dealership.openingHours.close, dealership.timeZone)
  return toMs(window.start) >= toMs(open) && toMs(window.end) <= toMs(close)
}

/** Holds the required skill and works on that ISO weekday. */
export function isQualified(technician: Technician, serviceType: ServiceType, isoWeekday: number): boolean {
  return technician.skills.includes(serviceType.requiredSkill) && technician.workingDays.includes(isoWeekday)
}

/** Active bay of the required type. */
export function isBayCompatible(bay: ServiceBay, serviceType: ServiceType): boolean {
  return bay.active && bay.type === serviceType.requiredBayType
}

/** No CONFIRMED appointment using this resource overlaps the window (cancelled never block). */
export function isResourceFree(
  kind: 'technician' | 'bay',
  resourceId: string,
  window: TimeWindow,
  appointments: readonly Appointment[],
): boolean {
  return !appointments.some(
    (a) =>
      a.status === 'CONFIRMED' &&
      (kind === 'technician' ? a.technicianId : a.bayId) === resourceId &&
      overlaps(a, window),
  )
}
