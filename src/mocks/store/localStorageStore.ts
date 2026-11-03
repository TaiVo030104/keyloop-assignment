import { SCHEMA_VERSION, type DbState, type SchedulerStore } from './SchedulerStore'

export const DB_KEY = 'kss:db:v1'

/**
 * Browser store shared by all tabs of the origin (needed for the two-advisor scenario).
 * Re-seeds automatically when the key is missing, unreadable or of another schema version.
 */
export class LocalStorageStore implements SchedulerStore {
  constructor(
    private readonly seed: () => DbState,
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = DB_KEY,
  ) {}

  read(): DbState {
    const raw = this.storage.getItem(this.key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<DbState>
        if (parsed.schemaVersion === SCHEMA_VERSION) return parsed as DbState
      } catch {
        // fall through to re-seed
      }
    }
    const fresh = this.seed()
    this.write(fresh)
    return fresh
  }

  write(state: DbState): void {
    this.storage.setItem(this.key, JSON.stringify(state))
  }

  reset(): void {
    this.write(this.seed())
  }
}
