import type {
  Appointment,
  Customer,
  Dealership,
  ServiceBay,
  ServiceType,
  Technician,
  Vehicle,
} from '@/domain'

export const SCHEMA_VERSION = 1

/** Internal record — never exposed through the API (data-model: IdempotencyRecord). */
export interface IdempotencyRecord {
  key: string
  requestHash: string
  appointmentId: string
  createdAt: string
}

export interface DbState {
  schemaVersion: typeof SCHEMA_VERSION
  dealerships: Dealership[]
  serviceTypes: ServiceType[]
  bays: ServiceBay[]
  technicians: Technician[]
  customers: Customer[]
  vehicles: Vehicle[]
  appointments: Appointment[]
  idempotency: IdempotencyRecord[]
}

/**
 * Persistence seam for the mock backend (research R6). The data set is tiny, so the whole
 * state is read and written at once; callers mutate inside the booking lock.
 */
export interface SchedulerStore {
  read(): DbState
  write(state: DbState): void
  /** Replace all data with a fresh seed. */
  reset(): void
}
