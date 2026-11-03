import { Button } from '@/components/ui/button'
import { formatShortDate, formatTime } from '@/lib/format'

/** Nearest alternative start times; one action to pick (US2). */
export function AlternativesList(props: {
  alternatives: string[]
  timeZone: string
  requestedStart?: string
  onPick: (start: string) => void
}) {
  const { alternatives, timeZone, requestedStart, onPick } = props
  if (alternatives.length === 0) {
    return <p className="text-sm text-slate-800">No availability in the next 7 days for this service.</p>
  }
  return (
    <div>
      <p id="alternatives-heading" className="text-sm font-medium text-slate-900">
        Nearest available start times
      </p>
      <ul aria-labelledby="alternatives-heading" className="mt-2 flex flex-wrap gap-2">
        {alternatives.map((a) => (
          <li key={a}>
            <Button variant="secondary" onClick={() => onPick(a)}>
              {a === requestedStart
                ? `Same time, different technician/bay (${formatTime(a, timeZone)})`
                : `${formatShortDate(a, timeZone)} · ${formatTime(a, timeZone)}`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
