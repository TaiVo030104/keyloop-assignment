import type { Dealership } from '@/api/queries'
import { Field, inputClass } from '@/components/ui/field'

export function ScheduleFilters(props: {
  dealerships: Dealership[]
  dealershipId: string
  date: string
  onChange: (next: { dealershipId: string; date: string }) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,12rem)]">
      <Field id="schedule-dealership" label="Dealership">
        {(aria) => (
          <select {...aria} className={inputClass} value={props.dealershipId} onChange={(e) => props.onChange({ dealershipId: e.target.value, date: props.date })}>
            {props.dealerships.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id="schedule-date" label="Date">
        {(aria) => (
          <input
            {...aria}
            type="date"
            className={inputClass}
            value={props.date}
            onChange={(e) => e.target.value && props.onChange({ dealershipId: props.dealershipId, date: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}
