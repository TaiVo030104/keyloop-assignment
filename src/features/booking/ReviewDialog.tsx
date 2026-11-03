import { useState } from 'react'
import { ConflictError } from '@/api/errors'
import { useCreateAppointment, type AppointmentView, type CreateAppointmentRequest } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/status'
import { formatRange } from '@/lib/format'
import { track } from '@/observability/telemetry'
import { AlternativesList } from './AlternativesList'
import { REASON_TEXT } from './reasons'

export interface ReviewSummary {
  customerName: string
  vehicleLabel: string
  serviceTypeName: string
  dealershipName: string
  timeZone: string
  window: { start: string; end: string }
  technicianName: string
  bayName: string
}

/**
 * Review step before confirming (FR-009). Mounted fresh each time it opens, so one
 * Idempotency-Key is created per review; retries reuse it (FR-014, research R7).
 */
export function ReviewDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: CreateAppointmentRequest
  summary: ReviewSummary
  onConfirmed: (appointment: AppointmentView) => void
  onPickAlternative: (start: string) => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} title="Review appointment" description="Check the details with the customer, then confirm.">
      {props.open && <ReviewBody {...props} />}
    </Dialog>
  )
}

function ReviewBody(props: Parameters<typeof ReviewDialog>[0]) {
  const { request, summary } = props
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const create = useCreateAppointment()
  const conflict = create.error instanceof ConflictError ? create.error : undefined

  const confirm = () => {
    if (create.isPending) return
    create.mutate(
      { body: request, idempotencyKey },
      {
        onSuccess: (appointment) => {
          track('booking.confirmed', { reference: appointment.reference, dealershipId: appointment.dealershipId })
          props.onConfirmed(appointment)
        },
        onError: (err) => {
          if (err instanceof ConflictError) track('booking.conflict', { reason: err.reason, correlationId: err.correlationId })
        },
      },
    )
  }

  const rows: [string, string][] = [
    ['Customer', summary.customerName],
    ['Vehicle', summary.vehicleLabel],
    ['Service', summary.serviceTypeName],
    ['Dealership', summary.dealershipName],
    ['When', `${formatRange(summary.window.start, summary.window.end, summary.timeZone)} (${summary.timeZone})`],
    ['Technician', summary.technicianName],
    ['Bay', summary.bayName],
  ]

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium text-slate-700">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {conflict && (
        <div role="alert" className="space-y-3 rounded-md border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">This slot was just taken.</p>
          <p>{REASON_TEXT[conflict.reason]} Your selections are kept — pick another time:</p>
          <AlternativesList
            alternatives={conflict.alternatives}
            timeZone={summary.timeZone}
            requestedStart={request.start}
            onPick={(start) => {
              props.onOpenChange(false)
              props.onPickAlternative(start)
            }}
          />
        </div>
      )}
      {create.isError && !conflict && <ErrorState title="Could not confirm the appointment" error={create.error} onRetry={confirm} />}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => props.onOpenChange(false)}>
          Back
        </Button>
        {!conflict && (
          <Button onClick={confirm} disabled={create.isPending} aria-disabled={create.isPending}>
            {create.isPending ? 'Confirming…' : 'Confirm appointment'}
          </Button>
        )}
      </div>
    </div>
  )
}
