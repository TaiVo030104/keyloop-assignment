import { findAlternatives } from './alternatives'
import { evaluateSlot, windowFor } from './availability'
import { isBayCompatible, isQualified, isResourceFree } from './rules'
import { isAlignedTo15InZone, isoWeekdayInZone, localDate } from './time'
import type {
  Appointment,
  AppointmentView,
  Customer,
  Instant,
  ResourceRef,
  SchedulingContext,
  ServiceBay,
  ServiceType,
  Technician,
  TimeWindow,
  UnavailableReason,
  Vehicle,
} from './types'

export interface BookingRequest {
  customerId: string
  vehicleId: string
  start: Instant
  technicianId: string
  bayId: string
}

export interface FieldError {
  field: string
  message: string
}

export type BookingDecision =
  | { outcome: 'ok'; window: TimeWindow; technician: ResourceRef; bay: ResourceRef }
  | { outcome: 'invalid'; errors: FieldError[]; reason?: UnavailableReason }
  | { outcome: 'conflict'; reason: UnavailableReason; alternatives: Instant[] }

const RULE_MESSAGES: Partial<Record<UnavailableReason, string>> = {
  SERVICE_NOT_OFFERED: 'This service type is not offered at the dealership.',
  START_IN_PAST: 'The start time is in the past.',
  DEALERSHIP_CLOSED: 'The dealership is closed on that day.',
  OUTSIDE_OPENING_HOURS: 'The service cannot finish within opening hours.',
}

/**
 * Re-validates a confirmation for the exact technician and bay the user reviewed (FR-011,
 * research R8). Never reassigns silently: if either is taken the result is a conflict with
 * fresh alternatives (the requested start comes first when other resources are still free).
 */
export function decideBooking(
  input: { ctx: SchedulingContext; request: BookingRequest; vehicle: Vehicle },
  now: Instant,
): BookingDecision {
  const { ctx, request, vehicle } = input
  const { dealership, serviceType } = ctx
  const errors: FieldError[] = []

  if (vehicle.customerId !== request.customerId) {
    errors.push({ field: 'vehicleId', message: 'The vehicle does not belong to the customer.' })
  }
  if (!isAlignedTo15InZone(request.start, dealership.timeZone)) {
    errors.push({ field: 'start', message: 'Start time must be on a 15-minute boundary.' })
  }
  const technician = ctx.technicians.find((t) => t.id === request.technicianId && t.dealershipId === dealership.id)
  const bay = ctx.bays.find((b) => b.id === request.bayId && b.dealershipId === dealership.id)
  if (!technician) errors.push({ field: 'technicianId', message: 'Technician does not belong to the dealership.' })
  if (!bay) errors.push({ field: 'bayId', message: 'Bay does not belong to the dealership.' })
  if (errors.length > 0 || !technician || !bay) return { outcome: 'invalid', errors }

  const slot = evaluateSlot(ctx, request.start, now)
  if (!slot.ok && RULE_MESSAGES[slot.reason]) {
    return { outcome: 'invalid', reason: slot.reason, errors: [{ field: 'start', message: RULE_MESSAGES[slot.reason]! }] }
  }

  const window = windowFor(ctx, request.start)
  const weekday = isoWeekdayInZone(request.start, dealership.timeZone)
  if (!isQualified(technician, serviceType, weekday)) {
    errors.push({ field: 'technicianId', message: 'Technician is not qualified for this service on that day.' })
  }
  if (!isBayCompatible(bay, serviceType)) {
    errors.push({ field: 'bayId', message: 'Bay is inactive or of the wrong type for this service.' })
  }
  if (errors.length > 0) return { outcome: 'invalid', errors }

  const proposedFree =
    isResourceFree('technician', technician.id, window, ctx.appointments) &&
    isResourceFree('bay', bay.id, window, ctx.appointments)
  if (proposedFree) {
    return { outcome: 'ok', window, technician: { id: technician.id, name: technician.name }, bay: { id: bay.id, name: bay.name } }
  }

  return {
    outcome: 'conflict',
    reason: slot.ok ? 'PROPOSED_RESOURCE_TAKEN' : slot.reason,
    alternatives: slot.ok
      ? [request.start, ...findAlternatives(ctx, request.start, now, { limit: 4 }).filter((a) => a !== request.start)]
      : findAlternatives(ctx, request.start, now),
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** `APT-YYYYMMDD-XXXX`, date = dealership-local start date (FR-012). `random` returns [0, 1). */
export function makeReference(start: Instant, timeZone: string, random: () => number): string {
  const date = localDate(start, timeZone).replaceAll('-', '')
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length]
  return `APT-${date}-${suffix}`
}

export function buildAppointment(params: {
  id: string
  reference: string
  request: BookingRequest & { dealershipId: string; serviceTypeId: string }
  window: TimeWindow
  now: Instant
}): Appointment {
  const { request: r } = params
  return {
    id: params.id,
    reference: params.reference,
    status: 'CONFIRMED',
    customerId: r.customerId,
    vehicleId: r.vehicleId,
    dealershipId: r.dealershipId,
    serviceTypeId: r.serviceTypeId,
    technicianId: r.technicianId,
    bayId: r.bayId,
    start: params.window.start,
    end: params.window.end,
    createdAt: params.now,
    cancelledAt: null,
  }
}

export function cancelAppointment(a: Appointment, now: Instant): Appointment {
  return a.status === 'CANCELLED' ? a : { ...a, status: 'CANCELLED', cancelledAt: now }
}

export function vehicleLabel(v: Vehicle): string {
  return `${v.year} ${v.make} ${v.model} · ${v.vin}`
}

export function toAppointmentView(
  a: Appointment,
  refs: { customer: Customer; vehicle: Vehicle; serviceType: ServiceType; technician: Technician; bay: ServiceBay },
): AppointmentView {
  return {
    ...a,
    customerName: `${refs.customer.firstName} ${refs.customer.lastName}`,
    vehicleLabel: vehicleLabel(refs.vehicle),
    serviceTypeName: refs.serviceType.name,
    technicianName: refs.technician.name,
    bayName: refs.bay.name,
  }
}
