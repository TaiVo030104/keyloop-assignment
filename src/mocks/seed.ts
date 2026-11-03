/**
 * Deterministic synthetic seed (data-model.md "Seed data"). No real personal data:
 * phone numbers use Ofcom drama ranges / reserved patterns and emails use example.com.
 */
import {
  addLocalDays,
  addMinutes,
  isoWeekdayInZone,
  localDate,
  zonedToInstant,
  type Appointment,
  type Customer,
  type Dealership,
  type Instant,
  type ServiceBay,
  type ServiceType,
  type Technician,
  type Vehicle,
} from '@/domain'
import { SCHEMA_VERSION, type DbState } from './store/SchedulerStore'

const MON_SAT = [1, 2, 3, 4, 5, 6]
const MON_FRI = [1, 2, 3, 4, 5]
const ALL_SERVICES = ['st-oil', 'st-brakes', 'st-ev', 'st-align', 'st-diag']

export const dealerships: Dealership[] = [
  {
    id: 'd-london',
    name: 'Keyloop Motors London',
    timeZone: 'Europe/London',
    openingHours: { open: '08:00', close: '18:00' },
    openDays: MON_SAT,
    serviceTypeIds: ALL_SERVICES,
  },
  {
    id: 'd-saigon',
    name: 'Keyloop Motors Saigon',
    timeZone: 'Asia/Ho_Chi_Minh',
    openingHours: { open: '07:30', close: '17:30' },
    openDays: MON_SAT,
    serviceTypeIds: ALL_SERVICES,
  },
]

export const serviceTypes: ServiceType[] = [
  { id: 'st-oil', name: 'Oil change', durationMinutes: 60, requiredSkill: 'GENERAL_MAINTENANCE', requiredBayType: 'GENERAL' },
  { id: 'st-brakes', name: 'Brake service', durationMinutes: 90, requiredSkill: 'BRAKES', requiredBayType: 'GENERAL' },
  { id: 'st-ev', name: 'EV battery check', durationMinutes: 120, requiredSkill: 'EV_SYSTEMS', requiredBayType: 'EV' },
  { id: 'st-align', name: 'Wheel alignment', durationMinutes: 45, requiredSkill: 'ALIGNMENT', requiredBayType: 'ALIGNMENT' },
  { id: 'st-diag', name: 'Diagnostics', durationMinutes: 30, requiredSkill: 'DIAGNOSTICS', requiredBayType: 'GENERAL' },
]

export const bays: ServiceBay[] = [
  { id: 'lon-bay-1', dealershipId: 'd-london', name: 'Bay 1', type: 'GENERAL', active: true },
  { id: 'lon-bay-2', dealershipId: 'd-london', name: 'Bay 2', type: 'GENERAL', active: true },
  { id: 'lon-bay-3', dealershipId: 'd-london', name: 'Bay 3 (closed for repair)', type: 'GENERAL', active: false },
  { id: 'lon-bay-ev', dealershipId: 'd-london', name: 'EV Bay', type: 'EV', active: true },
  { id: 'lon-bay-align', dealershipId: 'd-london', name: 'Alignment Bay', type: 'ALIGNMENT', active: true },
  { id: 'sgn-bay-a', dealershipId: 'd-saigon', name: 'Bay A', type: 'GENERAL', active: true },
  { id: 'sgn-bay-b', dealershipId: 'd-saigon', name: 'Bay B', type: 'GENERAL', active: true },
  { id: 'sgn-bay-ev', dealershipId: 'd-saigon', name: 'EV Bay', type: 'EV', active: true },
  { id: 'sgn-bay-align', dealershipId: 'd-saigon', name: 'Alignment Bay', type: 'ALIGNMENT', active: true },
]

/** Exactly one EV technician per dealership so "no qualified technician" is easy to demo. */
export const technicians: Technician[] = [
  { id: 'lon-t-oliver', dealershipId: 'd-london', name: 'Oliver Hughes', skills: ['GENERAL_MAINTENANCE', 'BRAKES', 'DIAGNOSTICS'], workingDays: MON_SAT },
  { id: 'lon-t-amelia', dealershipId: 'd-london', name: 'Amelia Clarke', skills: ['GENERAL_MAINTENANCE', 'ALIGNMENT'], workingDays: MON_FRI },
  { id: 'lon-t-george', dealershipId: 'd-london', name: 'George Patel', skills: ['BRAKES', 'DIAGNOSTICS', 'GENERAL_MAINTENANCE'], workingDays: MON_SAT },
  { id: 'lon-t-isla', dealershipId: 'd-london', name: 'Isla Turner', skills: ['EV_SYSTEMS', 'DIAGNOSTICS'], workingDays: MON_SAT },
  { id: 'sgn-t-an', dealershipId: 'd-saigon', name: 'Nguyen Van An', skills: ['GENERAL_MAINTENANCE', 'BRAKES'], workingDays: MON_SAT },
  { id: 'sgn-t-binh', dealershipId: 'd-saigon', name: 'Tran Thi Binh', skills: ['EV_SYSTEMS', 'DIAGNOSTICS'], workingDays: MON_SAT },
  { id: 'sgn-t-chau', dealershipId: 'd-saigon', name: 'Le Minh Chau', skills: ['ALIGNMENT', 'GENERAL_MAINTENANCE'], workingDays: MON_SAT },
  { id: 'sgn-t-dung', dealershipId: 'd-saigon', name: 'Pham Quoc Dung', skills: ['BRAKES', 'DIAGNOSTICS', 'GENERAL_MAINTENANCE'], workingDays: MON_FRI },
]

export const customers: Customer[] = [
  { id: 'c-01', firstName: 'Jane', lastName: 'Smith', phone: '+447700900101', email: 'jane.smith@example.com' },
  { id: 'c-02', firstName: 'John', lastName: 'Smith', phone: '+447700900102', email: 'john.smith@example.com' },
  { id: 'c-03', firstName: 'Emily', lastName: 'Johnson', phone: '+447700900103', email: 'emily.johnson@example.com' },
  { id: 'c-04', firstName: 'Mohammed', lastName: 'Ali', phone: '+447700900104', email: 'm.ali@example.com' },
  { id: 'c-05', firstName: 'Sophie', lastName: 'Brown', phone: '+447700900105', email: 'sophie.brown@example.com' },
  { id: 'c-06', firstName: 'Lan', lastName: 'Nguyen', phone: '+84900000106', email: 'lan.nguyen@example.com' },
  { id: 'c-07', firstName: 'Minh', lastName: 'Tran', phone: '+84900000107', email: 'minh.tran@example.com' },
  { id: 'c-08', firstName: 'Olivia', lastName: 'Wilson', phone: '+447700900108', email: 'olivia.wilson@example.com' },
  { id: 'c-09', firstName: 'Liam', lastName: 'Taylor', phone: '+447700900109', email: 'liam.taylor@example.com' },
  { id: 'c-10', firstName: 'Hannah', lastName: 'Davies', phone: '+447700900110', email: 'hannah.davies@example.com' },
]

export const vehicles: Vehicle[] = [
  { id: 'v-01a', customerId: 'c-01', vin: 'JTDBR32E720123456', make: 'Toyota', model: 'Corolla', year: 2022 },
  { id: 'v-01b', customerId: 'c-01', vin: '5YJ3E1EA7KF317000', make: 'Tesla', model: 'Model 3', year: 2023 },
  { id: 'v-02a', customerId: 'c-02', vin: 'WVWZZZ1KZ8W000123', make: 'Volkswagen', model: 'Golf', year: 2019 },
  { id: 'v-03a', customerId: 'c-03', vin: 'KNDJ23AU5N7000456', make: 'Kia', model: 'EV6', year: 2024 },
  { id: 'v-04a', customerId: 'c-04', vin: 'SAJAA4BN5HA000789', make: 'Jaguar', model: 'XE', year: 2018 },
  { id: 'v-04b', customerId: 'c-04', vin: 'WBA8E9G50GNT00321', make: 'BMW', model: '330i', year: 2021 },
  { id: 'v-05a', customerId: 'c-05', vin: 'VF1RFB00X6T000654', make: 'Renault', model: 'Zoe', year: 2020 },
  { id: 'v-06a', customerId: 'c-06', vin: 'RLHFC1640LY000987', make: 'Honda', model: 'City', year: 2021 },
  { id: 'v-07a', customerId: 'c-07', vin: 'RL4VF3EV1N0000135', make: 'VinFast', model: 'VF 8', year: 2024 },
  { id: 'v-07b', customerId: 'c-07', vin: 'MR0FB8CD5L0000246', make: 'Toyota', model: 'Vios', year: 2020 },
  { id: 'v-08a', customerId: 'c-08', vin: 'SALGA2EV8HA000357', make: 'Land Rover', model: 'Range Rover', year: 2022 },
  { id: 'v-09a', customerId: 'c-09', vin: 'WF0XXXGCDX8000468', make: 'Ford', model: 'Focus', year: 2017 },
  { id: 'v-10a', customerId: 'c-10', vin: 'YV1LFA2BCK1000579', make: 'Volvo', model: 'XC40', year: 2023 },
]

/** Next local date after `today` that is a Mon–Fri in the given zone. */
function nextWeekday(today: string, timeZone: string): string {
  let d = addLocalDays(today, 1)
  while (isoWeekdayInZone(zonedToInstant(d, '12:00', timeZone), timeZone) > 5) d = addLocalDays(d, 1)
  return d
}

/** Builds the seed with appointments on the next weekday after `now` in each dealership's zone. */
export function createSeed(now: Instant): DbState {
  const appointments: Appointment[] = []
  const st = (id: string) => serviceTypes.find((s) => s.id === id)!
  let n = 0
  const add = (
    d: Dealership,
    day: string,
    time: string,
    serviceTypeId: string,
    customerId: string,
    vehicleId: string,
    technicianId: string,
    bayId: string,
    cancelled = false,
  ) => {
    n += 1
    const start = zonedToInstant(day, time, d.timeZone)
    appointments.push({
      id: `seed-apt-${String(n).padStart(2, '0')}`,
      reference: `APT-${day.replaceAll('-', '')}-S${String(n).padStart(3, '0')}`,
      status: cancelled ? 'CANCELLED' : 'CONFIRMED',
      customerId,
      vehicleId,
      dealershipId: d.id,
      serviceTypeId,
      technicianId,
      bayId,
      start,
      end: addMinutes(start, st(serviceTypeId).durationMinutes),
      createdAt: now,
      cancelledAt: cancelled ? now : null,
    })
  }

  const [lon, sgn] = dealerships as [Dealership, Dealership]
  const lonDay = nextWeekday(localDate(now, lon.timeZone), lon.timeZone)
  add(lon, lonDay, '09:00', 'st-oil', 'c-01', 'v-01a', 'lon-t-oliver', 'lon-bay-1')
  add(lon, lonDay, '10:00', 'st-brakes', 'c-02', 'v-02a', 'lon-t-george', 'lon-bay-2')
  add(lon, lonDay, '11:00', 'st-align', 'c-05', 'v-05a', 'lon-t-amelia', 'lon-bay-align')
  add(lon, lonDay, '13:00', 'st-ev', 'c-03', 'v-03a', 'lon-t-isla', 'lon-bay-ev')
  add(lon, lonDay, '14:00', 'st-diag', 'c-04', 'v-04a', 'lon-t-oliver', 'lon-bay-1', true)

  const sgnDay = nextWeekday(localDate(now, sgn.timeZone), sgn.timeZone)
  add(sgn, sgnDay, '08:00', 'st-oil', 'c-06', 'v-06a', 'sgn-t-an', 'sgn-bay-a')
  add(sgn, sgnDay, '10:00', 'st-ev', 'c-07', 'v-07a', 'sgn-t-binh', 'sgn-bay-ev')

  return {
    schemaVersion: SCHEMA_VERSION,
    dealerships: structuredClone(dealerships),
    serviceTypes: structuredClone(serviceTypes),
    bays: structuredClone(bays),
    technicians: structuredClone(technicians),
    customers: structuredClone(customers),
    vehicles: structuredClone(vehicles),
    appointments,
    idempotency: [],
  }
}
