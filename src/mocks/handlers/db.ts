import { toAppointmentView, type Appointment, type AppointmentView, type SchedulingContext } from '@/domain'
import type { DbState } from '../store/SchedulerStore'

/** Read-model helpers for handlers. No scheduling rules here (Constitution IV). */
export function schedulingContext(db: DbState, dealershipId: string, serviceTypeId: string): SchedulingContext | undefined {
  const dealership = db.dealerships.find((d) => d.id === dealershipId)
  const serviceType = db.serviceTypes.find((s) => s.id === serviceTypeId)
  if (!dealership || !serviceType) return undefined
  return {
    dealership,
    serviceType,
    technicians: db.technicians.filter((t) => t.dealershipId === dealershipId),
    bays: db.bays.filter((b) => b.dealershipId === dealershipId),
    appointments: db.appointments.filter((a) => a.dealershipId === dealershipId),
  }
}

export function viewOf(db: DbState, a: Appointment): AppointmentView {
  const must = <T>(v: T | undefined, what: string): T => {
    if (!v) throw new Error(`Dangling reference ${what} on appointment ${a.id}`)
    return v
  }
  return toAppointmentView(a, {
    customer: must(db.customers.find((c) => c.id === a.customerId), 'customer'),
    vehicle: must(db.vehicles.find((v) => v.id === a.vehicleId), 'vehicle'),
    serviceType: must(db.serviceTypes.find((s) => s.id === a.serviceTypeId), 'serviceType'),
    technician: must(db.technicians.find((t) => t.id === a.technicianId), 'technician'),
    bay: must(db.bays.find((b) => b.id === a.bayId), 'bay'),
  })
}

/** Zod issues → contract `errors[]`. */
export function fieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  return issues.map((i) => ({ field: i.path.map(String).join('.') || '(body)', message: i.message }))
}
