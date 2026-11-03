/** Hand-built fixtures for domain unit tests (not shipped; excluded from coverage). */
import type {
  Appointment,
  Dealership,
  SchedulingContext,
  ServiceBay,
  ServiceType,
  Technician,
} from './types'

export const LONDON: Dealership = {
  id: 'd-lon',
  name: 'London',
  timeZone: 'Europe/London',
  openingHours: { open: '08:00', close: '18:00' },
  openDays: [1, 2, 3, 4, 5, 6],
  serviceTypeIds: ['st-oil', 'st-brakes', 'st-ev', 'st-align', 'st-diag'],
}

export const SAIGON: Dealership = {
  id: 'd-sgn',
  name: 'Saigon',
  timeZone: 'Asia/Ho_Chi_Minh',
  openingHours: { open: '07:30', close: '17:30' },
  openDays: [1, 2, 3, 4, 5, 6],
  serviceTypeIds: ['st-oil'],
}

export const ST: Record<string, ServiceType> = {
  oil: { id: 'st-oil', name: 'Oil change', durationMinutes: 60, requiredSkill: 'GENERAL_MAINTENANCE', requiredBayType: 'GENERAL' },
  brakes: { id: 'st-brakes', name: 'Brake service', durationMinutes: 90, requiredSkill: 'BRAKES', requiredBayType: 'GENERAL' },
  ev: { id: 'st-ev', name: 'EV battery check', durationMinutes: 120, requiredSkill: 'EV_SYSTEMS', requiredBayType: 'EV' },
  align: { id: 'st-align', name: 'Wheel alignment', durationMinutes: 45, requiredSkill: 'ALIGNMENT', requiredBayType: 'ALIGNMENT' },
  diag: { id: 'st-diag', name: 'Diagnostics', durationMinutes: 30, requiredSkill: 'DIAGNOSTICS', requiredBayType: 'GENERAL' },
  tyre: { id: 'st-tyre', name: 'Tyre fitting', durationMinutes: 30, requiredSkill: 'GENERAL_MAINTENANCE', requiredBayType: 'GENERAL' },
}

const ALL_WEEK = [1, 2, 3, 4, 5, 6]

export const TECHS: Technician[] = [
  { id: 't-bob', dealershipId: 'd-lon', name: 'Bob', skills: ['GENERAL_MAINTENANCE', 'BRAKES'], workingDays: ALL_WEEK },
  { id: 't-alice', dealershipId: 'd-lon', name: 'Alice', skills: ['GENERAL_MAINTENANCE', 'DIAGNOSTICS'], workingDays: [1, 2, 3, 4, 5] },
  { id: 't-eve', dealershipId: 'd-lon', name: 'Eve', skills: ['EV_SYSTEMS', 'DIAGNOSTICS'], workingDays: ALL_WEEK },
  { id: 't-al', dealershipId: 'd-lon', name: 'Al', skills: ['ALIGNMENT'], workingDays: ALL_WEEK },
]

export const BAYS: ServiceBay[] = [
  { id: 'b-2', dealershipId: 'd-lon', name: 'Bay 2', type: 'GENERAL', active: true },
  { id: 'b-1', dealershipId: 'd-lon', name: 'Bay 1', type: 'GENERAL', active: true },
  { id: 'b-ev', dealershipId: 'd-lon', name: 'EV Bay', type: 'EV', active: true },
  { id: 'b-al', dealershipId: 'd-lon', name: 'Alignment Bay', type: 'ALIGNMENT', active: true },
  { id: 'b-off', dealershipId: 'd-lon', name: 'Bay 0', type: 'GENERAL', active: false },
]

let seq = 0
export function appt(partial: Partial<Appointment> & Pick<Appointment, 'start' | 'end'>): Appointment {
  seq += 1
  return {
    id: `a-${seq}`,
    reference: `APT-20261104-T${String(seq).padStart(3, '0')}`,
    status: 'CONFIRMED',
    customerId: 'c-1',
    vehicleId: 'v-1',
    dealershipId: 'd-lon',
    serviceTypeId: 'st-oil',
    technicianId: 't-bob',
    bayId: 'b-1',
    createdAt: '2026-11-01T00:00:00Z',
    cancelledAt: null,
    ...partial,
  }
}

export function ctx(
  serviceType: ServiceType,
  appointments: Appointment[] = [],
  overrides: Partial<SchedulingContext> = {},
): SchedulingContext {
  return { dealership: LONDON, serviceType, technicians: TECHS, bays: BAYS, appointments, ...overrides }
}

/** "Now" used by most tests: Tue 2026-11-03 09:00 London (GMT). */
export const NOW = '2026-11-03T09:00:00Z'
