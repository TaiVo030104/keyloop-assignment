import { describe, expect, it } from 'vitest'
import { withLock } from './lock'

describe('withLock (in-process fallback)', () => {
  it('serialises critical sections and survives failures', async () => {
    const log: string[] = []
    const section = (name: string, ms: number) => () =>
      new Promise<string>((r) => {
        log.push(`${name}:start`)
        setTimeout(() => {
          log.push(`${name}:end`)
          r(name)
        }, ms)
      })
    const failing = withLock('t', () => Promise.reject(new Error('boom')), { forceFallback: true })
    const results = await Promise.all([
      withLock('t', section('a', 20), { forceFallback: true }),
      failing.catch((e: Error) => e.message),
      withLock('t', section('b', 1), { forceFallback: true }),
    ])
    expect(results).toEqual(['a', 'boom', 'b'])
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })
})
