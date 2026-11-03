import type { AvailabilityResult } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/ui/status'
import { formatRange } from '@/lib/format'
import { AlternativesList } from './AlternativesList'
import { REASON_TEXT } from './reasons'

export type AvailabilityState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown; retry: () => void }
  | { kind: 'result'; result: AvailabilityResult }

/** Live region announcing availability to assistive technology (FR-020). */
export function AvailabilityPanel(props: {
  state: AvailabilityState
  timeZone: string
  onReview: () => void
  onPickAlternative: (start: string) => void
}) {
  const { state, timeZone } = props
  return (
    <section aria-labelledby="availability-heading" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 id="availability-heading" className="text-base font-semibold">
        Availability
      </h2>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-2">
        {state.kind === 'idle' && <p className="text-sm text-slate-700">Complete the booking details to check availability.</p>}
        {state.kind === 'loading' && <LoadingState>Checking availability…</LoadingState>}
        {state.kind === 'result' && state.result.available && (
          <div className="space-y-1 text-sm">
            <p className="text-base font-semibold text-green-800">Available</p>
            <p>{formatRange(state.result.window.start, state.result.window.end, timeZone)}</p>
            <p>
              Technician: <strong>{state.result.technician.name}</strong>
            </p>
            <p>
              Bay: <strong>{state.result.bay.name}</strong>
            </p>
          </div>
        )}
        {state.kind === 'result' && !state.result.available && (
          <div className="space-y-1 text-sm">
            <p className="text-base font-semibold text-amber-800">Not available</p>
            <p>{REASON_TEXT[state.result.reason]}</p>
          </div>
        )}
      </div>
      {state.kind === 'error' && <ErrorState title="Could not check availability" error={state.error} onRetry={state.retry} />}
      {state.kind === 'result' && state.result.available && (
        <Button className="mt-3" onClick={props.onReview}>
          Review &amp; confirm
        </Button>
      )}
      {state.kind === 'result' && !state.result.available && (
        <div className="mt-3">
          <AlternativesList alternatives={state.result.alternatives} timeZone={timeZone} onPick={props.onPickAlternative} />
        </div>
      )}
    </section>
  )
}
