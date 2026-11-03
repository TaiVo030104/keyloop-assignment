import '@testing-library/jest-dom/vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { afterAll, afterEach, beforeAll, beforeEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '@/mocks/node'
import { runtime } from '@/mocks/runtime'
import { MemoryStore } from '@/mocks/store/memoryStore'
import { createSeed } from '@/mocks/seed'
import { overrideChaos } from '@/mocks/chaos'
import { memorySink } from '@/observability/logger'
import { TEST_NOW } from './testClock'

expect.extend(axeMatchers)

const store = new MemoryStore(() => createSeed(TEST_NOW))
runtime.configure({ store, now: () => TEST_NOW })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  store.reset()
  overrideChaos({ minLatencyMs: 0, maxLatencyMs: 0, failureRate: 0, failNext: false })
  memorySink.clear()
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
