import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'

describe('Reference endpoints', () => {
  it('GET /dealerships → 200 per contract, echoes correlation id', async () => {
    const r = await call('GET', '/dealerships', { headers: { 'X-Correlation-Id': 'corr-123' } })
    expect(r.status).toBe(200)
    validateResponse('GET', '/dealerships', 200, r.body)
    expect(r.headers.get('X-Correlation-Id')).toBe('corr-123')
    expect((r.body as { name: string }[]).map((d) => d.name)).toEqual(['Keyloop Motors London', 'Keyloop Motors Saigon'])
  })

  it('GET /dealerships/{id}/service-types → 200 with durations', async () => {
    const r = await call('GET', '/dealerships/d-london/service-types')
    expect(r.status).toBe(200)
    validateResponse('GET', '/dealerships/{dealershipId}/service-types', 200, r.body)
    expect(r.body).toHaveLength(5)
  })

  it('unknown dealership → 404 problem', async () => {
    const r = await call('GET', '/dealerships/nope/service-types')
    expect(r.status).toBe(404)
    validateResponse('GET', '/dealerships/{dealershipId}/service-types', 404, r.body)
  })
})
