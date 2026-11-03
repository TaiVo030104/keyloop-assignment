/**
 * Mutual exclusion for the booking critical section (research R7). Uses the Web Locks API,
 * which is shared across tabs of the same origin; falls back to an in-process promise queue
 * (Node tests, very old browsers).
 */
const queues = new Map<string, Promise<unknown>>()

function inProcess<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = queues.get(name) ?? Promise.resolve()
  const run = previous.then(fn, fn)
  // keep the chain alive regardless of outcome
  queues.set(
    name,
    run.catch(() => undefined),
  )
  return run
}

export function withLock<T>(name: string, fn: () => Promise<T> | T, opts: { forceFallback?: boolean } = {}): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks && !opts.forceFallback) {
    return locks.request(name, async () => fn()) as Promise<T>
  }
  return inProcess(name, fn)
}
