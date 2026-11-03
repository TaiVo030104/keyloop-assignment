import { useCancelAppointment, type AppointmentView } from '@/api/queries'
import { ConfirmDialog } from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/status'
import { formatRange } from '@/lib/format'
import { track } from '@/observability/telemetry'

/** Explicit confirmation before cancelling (FR-016). */
export function CancelDialog(props: { appointment: AppointmentView | null; timeZone: string; onClose: () => void }) {
  const cancel = useCancelAppointment()
  const a = props.appointment
  return (
    <ConfirmDialog
      open={!!a}
      onOpenChange={(open) => {
        if (!open) {
          cancel.reset()
          props.onClose()
        }
      }}
      title="Cancel appointment?"
      description={
        a ? (
          <>
            {a.reference}: {a.customerName}, {a.serviceTypeName}, {formatRange(a.start, a.end, props.timeZone)}. The technician and
            bay will become available again.
          </>
        ) : (
          ''
        )
      }
      confirmLabel="Yes, cancel appointment"
      cancelLabel="Keep appointment"
      pending={cancel.isPending}
      onConfirm={() =>
        a &&
        cancel.mutate(a.id, {
          onSuccess: (updated) => {
            track('booking.cancelled', { reference: updated.reference, dealershipId: updated.dealershipId })
            props.onClose()
          },
        })
      }
    >
      {cancel.isError && (
        <div className="mt-4">
          <ErrorState title="Could not cancel" error={cancel.error} />
        </div>
      )}
    </ConfirmDialog>
  )
}
