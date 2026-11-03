import { describe, expect, it } from 'vitest'
import { call, validateResponse } from './validator'

type C = { firstName: string; lastName: string; vehicles: unknown[] }

describe('GET /customers (FR-001)', () => {
  it('matches name case-insensitively and embeds vehicles', async () => {
    const r = await call('GET', '/customers?q=SMITH')
    expect(r.status).toBe(200)
    validateResponse('GET', '/customers', 200, r.body)
    const list = r.body as C[]
    expect(list.map((c) => `${c.firstName} ${c.lastName}`)).toEqual(['Jane Smith', 'John Smith'])
    expect(list[0]!.vehicles).toHaveLength(2)
  })

  it('matches phone digits and email', async () => {
    const byPhone = (await call('GET', '/customers?q=900103')).body as C[]
    expect(byPhone.map((c) => c.lastName)).toEqual(['Johnson'])
    const byEmail = (await call('GET', '/customers?q=m.ali@')).body as C[]
    expect(byEmail.map((c) => c.lastName)).toEqual(['Ali'])
  })

  it('respects limit and returns [] for no match', async () => {
    expect(((await call('GET', '/customers?q=example.com&limit=3')).body as C[]).length).toBe(3)
    expect((await call('GET', '/customers?q=zzzz')).body).toEqual([])
  })

  it('q shorter than 2 chars → 400 problem', async () => {
    const r = await call('GET', '/customers?q=a')
    expect(r.status).toBe(400)
    validateResponse('GET', '/customers', 400, r.body)
  })
})
