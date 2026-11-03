import { HttpResponse, http } from 'msw'
import { API, handle, problem } from '../http'
import { runtime } from '../runtime'

export const customerHandlers = [
  http.get(
    `${API}/customers`,
    handle('searchCustomers', ({ request }, { correlationId }) => {
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') ?? '').trim()
      const limitRaw = url.searchParams.get('limit')
      const limit = limitRaw === null ? 10 : Number(limitRaw)
      if (q.length < 2 || q.length > 100) {
        return problem(400, 'Invalid query', correlationId, 'q must be 2–100 characters.', {
          errors: [{ field: 'q', message: 'Enter at least 2 characters.' }],
        })
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return problem(400, 'Invalid query', correlationId, 'limit must be an integer 1–50.', {
          errors: [{ field: 'limit', message: 'Must be between 1 and 50.' }],
        })
      }

      const db = runtime.store.read()
      const needle = q.toLowerCase()
      const digits = q.replace(/\D/g, '')
      const matches = db.customers
        .filter(
          (c) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(needle) ||
            c.email.toLowerCase().includes(needle) ||
            (digits.length >= 2 && c.phone.replace(/\D/g, '').includes(digits)),
        )
        .slice(0, limit)
        .map((c) => ({
          ...c,
          vehicles: db.vehicles
            .filter((v) => v.customerId === c.id)
            .map(({ customerId: _omit, ...v }) => v),
        }))
      return HttpResponse.json(matches)
    }),
  ),
]
