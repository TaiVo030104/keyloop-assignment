/**
 * Domain types for the scheduler. Pure data — shared by the mock backend and tests.
 * Shapes are structurally identical to the OpenAPI schemas (contracts/openapi.yaml);
 * the domain does not import generated API types so it stays portable (Constitution II).
 */

/** ISO-8601 UTC instant, e.g. `2026-11-03T10:00:00Z`. */
export type Instant = string

/** Local calendar date `yyyy-MM-dd` in a dealership's time zone. */
export type LocalDate = string

/** Half-open window `[start, end)`. */
export interface TimeWindow {
  start: Instant
  end: Instant
}

export type Skill = 'GENERAL_MAINTENANCE' | 'BRAKES' | 'EV_SYSTEMS' | 'DIAGNOSTICS' | 'ALIGNMENT'
export type BayType = 'GENERAL' | 'EV' | 'ALIGNMENT'

export interface Dealership {
  id: string
  name: string
  /** IANA zone, e.g. `Europe/London`. */
  timeZone: string
  /** Local wall clock `HH:mm`, `open < close`, same every open day. */
  openingHours: { open: string; close: string }
  /** ISO weekdays 1 (Mon) – 7 (Sun), non-empty. */
  openDays: number[]
  serviceTypeIds: string[]
}

export interface ServiceType {
  id: string
  name: string
  /** > 0 and a multiple of 15. */
  durationMinutes: number
  requiredSkill: Skill
  requiredBayType: BayType
}

export interface ServiceBay {
  id: string
  dealershipId: string
  name: string
  type: BayType
  active: boolean
}

export interface Technician {
  id: string
  dealershipId: string
  name: string
  skills: Skill[]
  /** ISO weekdays; working hours equal dealership opening hours. */
  workingDays: number[]
}

export interface Vehicle {
  id: string
  customerId: string
  vin: string
  make: string
  model: string
  year: number
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
}

export type AppointmentStatus = 'CONFIRMED' | 'CANCELLED'

export interface Appointment {
  id: string
  reference: string
  status: AppointmentStatus
  customerId: string
  vehicleId: string
  dealershipId: string
  serviceTypeId: string
  technicianId: string
  bayId: string
  start: Instant
  end: Instant
  createdAt: Instant
  cancelledAt: Instant | null
}

export type UnavailableReason =
  | 'SERVICE_NOT_OFFERED'
  | 'START_IN_PAST'
  | 'DEALERSHIP_CLOSED'
  | 'OUTSIDE_OPENING_HOURS'
  | 'NO_QUALIFIED_TECHNICIAN'
  | 'NO_COMPATIBLE_BAY'
  | 'PROPOSED_RESOURCE_TAKEN'

export interface ResourceRef {
  id: string
  name: string
}

export interface Assignment {
  technician: ResourceRef
  bay: ResourceRef
}

/**
 * Everything the scheduling rules need for one dealership and one service type.
 * `technicians`, `bays` and `appointments` are expected to be scoped to the dealership
 * (callers may pass more; rules filter by dealership id defensively).
 */
export interface SchedulingContext {
  dealership: Dealership
  serviceType: ServiceType
  technicians: Technician[]
  bays: ServiceBay[]
  appointments: Appointment[]
}

export type AvailabilityResult =
  | { available: true; window: TimeWindow; technician: ResourceRef; bay: ResourceRef }
  | { available: false; window: TimeWindow; reason: UnavailableReason; alternatives: Instant[] }

export interface AppointmentView extends Appointment {
  customerName: string
  vehicleLabel: string
  serviceTypeName: string
  technicianName: string
  bayName: string
}
