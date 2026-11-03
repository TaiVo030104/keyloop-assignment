/** Latency and fault injection for the mock backend (research R16). */
export interface ChaosSettings {
  minLatencyMs: number
  maxLatencyMs: number
  /** 0..1 probability of a random 500. */
  failureRate: number
  /** Fail exactly the next request with a 500, then reset. */
  failNext: boolean
}

export const CHAOS_KEY = 'kss:chaos'
export const DEFAULT_CHAOS: ChaosSettings = { minLatencyMs: 200, maxLatencyMs: 600, failureRate: 0, failNext: false }

let override: ChaosSettings | null = null

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

export function getChaos(): ChaosSettings {
  if (override) return override
  const raw = storage()?.getItem(CHAOS_KEY)
  if (!raw) return DEFAULT_CHAOS
  try {
    return { ...DEFAULT_CHAOS, ...(JSON.parse(raw) as Partial<ChaosSettings>) }
  } catch {
    return DEFAULT_CHAOS
  }
}

export function setChaos(patch: Partial<ChaosSettings>): ChaosSettings {
  const next = { ...getChaos(), ...patch }
  if (override) override = next
  else storage()?.setItem(CHAOS_KEY, JSON.stringify(next))
  return next
}

/** Tests: keep settings in memory (no persistence) — pass `null` to clear. */
export function overrideChaos(settings: ChaosSettings | null): void {
  override = settings
}

/** Returns the delay to apply and whether this request must fail. Consumes `failNext`. */
export function rollChaos(random: () => number = Math.random): { delayMs: number; fail: boolean } {
  const s = getChaos()
  const delayMs = Math.round(s.minLatencyMs + random() * Math.max(0, s.maxLatencyMs - s.minLatencyMs))
  if (s.failNext) {
    setChaos({ failNext: false })
    return { delayMs, fail: true }
  }
  return { delayMs, fail: s.failureRate > 0 && random() < s.failureRate }
}
