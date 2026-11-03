import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import type { AppointmentView } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { formatRange, splitInZone } from '@/lib/format'

export function BookingSuccess(props: { appointment: AppointmentView; timeZone: string; onBookAnother: () => void }) {
  const { appointment: a, timeZone } = props
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  const { date } = splitInZone(a.start, timeZone)

  return (
    <section aria-labelledby="success-heading" className="rounded-lg border border-green-300 bg-green-50 p-6">
      <h2 id="success-heading" ref={heading} tabIndex={-1} className="text-lg font-semibold text-green-900">
        Appointment confirmed
      </h2>
      <p className="mt-1 text-sm">
        Reference <strong data-testid="appointment-reference">{a.reference}</strong>
      </p>
      <p className="mt-2 text-sm">
        {a.customerName} · {a.vehicleLabel}
        <br />
        {a.serviceTypeName}, {formatRange(a.start, a.end, timeZone)}
        <br />
        Technician {a.technicianName}, {a.bayName}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          to={`/schedule?dealershipId=${encodeURIComponent(a.dealershipId)}&date=${date}`}
        >
          View schedule for this day
        </Link>
        <Button onClick={props.onBookAnother}>Book another</Button>
      </div>
    </section>
  )
}
