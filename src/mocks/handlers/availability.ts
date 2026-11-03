import { HttpResponse, http } from 'msw'
import { z } from 'zod'
import { checkAvailability, isAlignedTo15InZone, toInstant } from '@/domain'
import { logger } from '@/observability/logger'
import { API, handle, problem, readJson } from '../http'
import { runtime } from '../runtime'
import { fieldErrors, schedulingContext } from './db'

const AvailabilityRequest = z.object({
  dealershipId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
})

export const availabilityHandlers = [
  http.post(
    `${API}/availability/check`,
    handle('checkAvailability', async ({ request }, { correlationId, traceId }) => {
      const parsed = AvailabilityRequest.safeParse(await readJson(request))
      if (!parsed.success) {
        return problem(400, 'Invalid request body', correlationId, undefined, { errors: fieldErrors(parsed.error.issues) })
      }
      const body = parsed.data
      const db = runtime.store.read()
      const ctx = schedulingContext(db, body.dealershipId, body.serviceTypeId)
      if (!ctx) return problem(404, 'Dealership or service type not found', correlationId)

      const start = toInstant(Date.parse(body.start))
      if (!isAlignedTo15InZone(start, ctx.dealership.timeZone)) {
        return problem(400, 'Invalid start time', correlationId, 'Start must be on a 15-minute boundary.', {
          errors: [{ field: 'start', message: 'Start must be on a 15-minute boundary.' }],
        })
      }

      const result = checkAvailability(ctx, start, runtime.now())
      logger.info('mock.availability', {
        correlationId,
        traceId,
        available: result.available,
        reason: result.available ? undefined : result.reason,
      })
      return HttpResponse.json(result)
    }),
  ),
]
