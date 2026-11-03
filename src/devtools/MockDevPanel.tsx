import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getChaos, setChaos, type ChaosSettings } from '@/mocks/chaos'
import { runtime } from '@/mocks/runtime'

/** Demo controls for the mock backend (research R16). Only rendered when mocks are enabled. */
export default function MockDevPanel() {
  const qc = useQueryClient()
  const [chaos, setLocal] = useState<ChaosSettings>(getChaos())
  const update = (patch: Partial<ChaosSettings>) => setLocal(setChaos(patch))

  return (
    <details className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-lg">
      <summary className="cursor-pointer font-medium">Mock backend controls</summary>
      <div className="mt-3 space-y-3">
        <button
          type="button"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
          onClick={() => {
            runtime.store.reset()
            void qc.invalidateQueries()
          }}
        >
          Reset demo data
        </button>
        <label className="block">
          Max latency: {chaos.maxLatencyMs} ms
          <input
            type="range"
            min={0}
            max={3000}
            step={100}
            value={chaos.maxLatencyMs}
            onChange={(e) => {
              const max = Number(e.target.value)
              update({ maxLatencyMs: max, minLatencyMs: Math.min(chaos.minLatencyMs, max) })
            }}
            className="w-full"
          />
        </label>
        <label className="block">
          Failure rate: {Math.round(chaos.failureRate * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={chaos.failureRate}
            onChange={(e) => update({ failureRate: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={chaos.failNext} onChange={(e) => update({ failNext: e.target.checked })} />
          Fail next request (500)
        </label>
      </div>
    </details>
  )
}
