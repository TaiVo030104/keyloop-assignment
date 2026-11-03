import { toInstant, type Instant } from '@/domain'
import type { SchedulerStore } from './store/SchedulerStore'

/**
 * Runtime wiring for the mock backend: the active store, the clock and id generation.
 * Tests swap these for a MemoryStore and a fixed clock.
 */
let store: SchedulerStore | null = null
let clock: () => Instant = () => toInstant(Date.now())
let random: () => number = Math.random
let uuid: () => string = () => crypto.randomUUID()

export const runtime = {
  get store(): SchedulerStore {
    if (!store) throw new Error('Mock store not configured — call runtime.configure() first')
    return store
  },
  now: (): Instant => clock(),
  random: (): number => random(),
  uuid: (): string => uuid(),
  configure(opts: { store?: SchedulerStore; now?: () => Instant; random?: () => number; uuid?: () => string }): void {
    if (opts.store) store = opts.store
    if (opts.now) clock = opts.now
    if (opts.random) random = opts.random
    if (opts.uuid) uuid = opts.uuid
  },
}
