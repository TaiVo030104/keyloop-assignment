import { describe, expect, it } from 'vitest'
import { checkAvailability } from './availability'
import { LONDON, NOW, ST, appt, ctx } from './fixtures.testutil'
import type { ServiceBay, Technician } from './types'

/**
 * Performance budget from plan.md: availability + alternatives < 20 ms.
 * Worst case: 10 qualified technicians and 10 compatible bays, ~200 busy appointments,
 * and a requested slot that is unavailable so the full 7-day alternative search runs.
 */
describe('performance budget (plan.md, SC-002)', () => {
  it('worst-case check with alternatives stays well under 20 ms', () => {
    const techs: Technician[] = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`, dealershipId: LONDON.id, name: `Tech ${i}`, skills: ['GENERAL_MAINTENANCE'], workingDays: [1, 2, 3, 4, 5, 6],
    }))
    const bays: ServiceBay[] = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`, dealershipId: LONDON.id, name: `Bay ${i}`, type: 'GENERAL', active: true,
    }))
    // Block every technician all day for the next 6 days → search must scan the whole horizon.
    const busy = techs.flatMap((t, i) =>
      Array.from({ length: 6 }, (_, d) => {
        const day = String(4 + d).padStart(2, '0')
        return appt({ start: `2026-11-${day}T08:00:00Z`, end: `2026-11-${day}T18:00:00Z`, technicianId: t.id, bayId: `b${i}` })
      }),
    )
    const c = ctx(ST.oil!, busy, { technicians: techs, bays })

    checkAvailability(c, '2026-11-04T10:00:00Z', NOW) // warm-up (JIT)
    const runs = 20
    const t0 = performance.now()
    let result
    for (let i = 0; i < runs; i++) result = checkAvailability(c, '2026-11-04T10:00:00Z', NOW)
    const avgMs = (performance.now() - t0) / runs

    expect(result).toMatchObject({ available: false, reason: 'NO_QUALIFIED_TECHNICIAN' })
    console.info(`checkAvailability worst case: ${avgMs.toFixed(2)} ms avg over ${runs} runs`)
    expect(avgMs).toBeLessThan(20)
  })
})
