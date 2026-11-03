import type { DbState, SchedulerStore } from './SchedulerStore'

/** In-memory store for tests. `seed` is called on construction and on reset. */
export class MemoryStore implements SchedulerStore {
  private state: DbState

  constructor(private readonly seed: () => DbState) {
    this.state = seed()
  }

  read(): DbState {
    return structuredClone(this.state)
  }

  write(state: DbState): void {
    this.state = structuredClone(state)
  }

  reset(): void {
    this.state = this.seed()
  }
}
