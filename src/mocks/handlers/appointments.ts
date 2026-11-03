import { HttpResponse, http } from 'msw'
import { z } from 'zod'
import {
  buildAppointment,
  cancelAppointment,
  decideBooking,
  localDayBounds,
  makeReference,
  toInstant,
  toMs,
} from '@/domain'
import { logger } from '@/observability/logger'
import { API, handle, problem, readJson } from '../http'
import { findRecord, hashRequest, pruneRecords } from '../idempotency'
import { withLock } from '../lock'
import { runtime } from '../runtime'
import { fieldErrors, schedulingContext, viewOf } from './db'

export const BOOKING_LOCK = 'kss-booking'

const CreateAppointmentRequest = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  dealershipId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  technicianId: z.string().min(1),
  bayId: z.string().min(1),
})

const ListQuery = z.object({
  dealershipId: z.string().min(1),
  date: z.iso.date(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
})

const UUID = z.uuid()

export const appointmentHandlers = [
  http.get(
    `${API}/appointments`,
    handle('listAppointments', ({ request }, { correlationId }) => {
      const sp = new URL(request.url).searchParams
      const parsed = ListQuery.safeParse({
        dealershipId: sp.get('dealershipId') ?? undefined,
        date: sp.get('date') ?? undefined,
        status: sp.get('status') ?? undefined,
      })
      if (!parsed.success) {
        return problem(400, 'Invalid query', correlationId, undefined, { errors: fieldErrors(parsed.error.issues) })
      }
      const { dealershipId, date, status } = parsed.data
      const db = runtime.store.read()
      const dealership = db.dealerships.find((d) => d.id === dealershipId)
      if (!dealership) return problem(404, 'Dealership not found', correlationId)

      const day = localDayBounds(date, dealership.timeZone)
      const list = db.appointments
        .filter(
          (a) =>
            a.dealershipId === dealershipId &&
            toMs(a.start) >= toMs(day.start) &&
            toMs(a.start) < toMs(day.end) &&
            (!status || a.status === status),
        )
        .sort((a, b) => toMs(a.start) - toMs(b.start) || a.reference.localeCompare(b.reference))
        .map((a) => viewOf(db, a))
      return HttpResponse.json(list)
    }),
  ),

  http.get(
    `${API}/appointments/:appointmentId`,
    handle<{ appointmentId: string }>('getAppointment', ({ params }, { correlationId }) => {
      const db = runtime.store.read()
      const a = db.appointments.find((x) => x.id === params.appointmentId)
      if (!a) return problem(404, 'Appointment not found', correlationId)
      return HttpResponse.json(viewOf(db, a))
    }),
  ),

  http.post(
    `${API}/appointments/:appointmentId/cancel`,
    handle<{ appointmentId: string }>('cancelAppointment', ({ params }, { correlationId, traceId }) =>
      withLock(BOOKING_LOCK, () => {
        const db = runtime.store.read()
        const idx = db.appointments.findIndex((x) => x.id === params.appointmentId)
        const current = db.appointments[idx]
        if (!current) return problem(404, 'Appointment not found', correlationId)
        const cancelled = cancelAppointment(current, runtime.now())
        if (cancelled !== current) {
          db.appointments[idx] = cancelled
          runtime.store.write(db)
          logger.info('mock.appointment.cancelled', { correlationId, traceId, appointmentId: current.id })
        }
        return HttpResponse.json(viewOf(db, cancelled))
      }),
    ),
  ),

  http.post(
    `${API}/appointments`,
    handle('createAppointment', async ({ request }, { correlationId, traceId }) => {
      const key = request.headers.get('Idempotency-Key')
      if (!key || !UUID.safeParse(key).success) {
        return problem(400, 'Missing or invalid Idempotency-Key', correlationId, 'Send a UUID Idempotency-Key header.', {
          errors: [{ field: 'Idempotency-Key', message: 'Required UUID header.' }],
        })
      }
      const parsed = CreateAppointmentRequest.safeParse(await readJson(request))
      if (!parsed.success) {
        return problem(400, 'Invalid request body', correlationId, undefined, { errors: fieldErrors(parsed.error.issues) })
      }
      const body = { ...parsed.data, start: toInstant(Date.parse(parsed.data.start)) }
      const requestHash = hashRequest(body)

      // Critical section: idempotency lookup → re-read → re-validate → write (research R7).
      return withLock(BOOKING_LOCK, () => {
        const now = runtime.now()
        let db = pruneRecords(runtime.store.read(), toMs(now))

        const seen = findRecord(db, key)
        if (seen) {
          if (seen.requestHash !== requestHash) {
            return problem(422, 'Idempotency-Key reused with a different request', correlationId, undefined, {
              errors: [{ field: 'Idempotency-Key', message: 'Use a new key for a different booking request.' }],
            })
          }
          const original = db.appointments.find((a) => a.id === seen.appointmentId)
          if (original) {
            logger.info('mock.appointment.replayed', { correlationId, traceId, appointmentId: original.id })
            return HttpResponse.json(viewOf(db, original), {
              status: 201,
              headers: { Location: `/api/appointments/${original.id}`, 'Idempotent-Replayed': 'true' },
            })
          }
        }

        const customer = db.customers.find((c) => c.id === body.customerId)
        const vehicle = db.vehicles.find((v) => v.id === body.vehicleId)
        const ctx = schedulingContext(db, body.dealershipId, body.serviceTypeId)
        if (!customer || !vehicle || !ctx) {
          return problem(404, 'Referenced resource not found', correlationId, 'Customer, vehicle, dealership or service type does not exist.')
        }

        const decision = decideBooking({ ctx, request: body, vehicle }, now)
        if (decision.outcome === 'invalid') {
          return problem(422, 'Booking violates a business rule', correlationId, decision.errors[0]?.message, {
            errors: decision.errors,
            ...(decision.reason ? { reason: decision.reason } : {}),
          })
        }
        if (decision.outcome === 'conflict') {
          logger.warn('mock.appointment.conflict', { correlationId, traceId, reason: decision.reason })
          return problem(409, 'Slot no longer available', correlationId, 'The reviewed technician or bay was just taken.', {
            reason: decision.reason,
            alternatives: decision.alternatives,
          })
        }

        let reference: string
        do {
          reference = makeReference(decision.window.start, ctx.dealership.timeZone, runtime.random)
        } while (db.appointments.some((a) => a.reference === reference))

        const appointment = buildAppointment({
          id: runtime.uuid(),
          reference,
          request: body,
          window: decision.window,
          now,
        })
        db = {
          ...db,
          appointments: [...db.appointments, appointment],
          idempotency: [...db.idempotency, { key, requestHash, appointmentId: appointment.id, createdAt: now }],
        }
        runtime.store.write(db)
        logger.info('mock.appointment.created', { correlationId, traceId, appointmentId: appointment.id, reference })
        return HttpResponse.json(viewOf(db, appointment), {
          status: 201,
          headers: { Location: `/api/appointments/${appointment.id}` },
        })
      })
    }),
  ),
]
