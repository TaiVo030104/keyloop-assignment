import { HttpResponse, http } from 'msw'
import { API, handle, problem } from '../http'
import { runtime } from '../runtime'

export const referenceHandlers = [
  http.get(
    `${API}/dealerships`,
    handle('listDealerships', () => {
      const db = runtime.store.read()
      return HttpResponse.json(db.dealerships.map(({ serviceTypeIds: _omit, ...d }) => d))
    }),
  ),

  http.get(
    `${API}/dealerships/:dealershipId/service-types`,
    handle<{ dealershipId: string }>('listServiceTypes', ({ params }, { correlationId }) => {
      const db = runtime.store.read()
      const dealership = db.dealerships.find((d) => d.id === params.dealershipId)
      if (!dealership) return problem(404, 'Dealership not found', correlationId, `No dealership '${params.dealershipId}'.`)
      return HttpResponse.json(db.serviceTypes.filter((s) => dealership.serviceTypeIds.includes(s.id)))
    }),
  ),
]
