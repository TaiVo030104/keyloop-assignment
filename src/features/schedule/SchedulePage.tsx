import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAppointments, useDealerships, type AppointmentView } from '@/api/queries'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/status'
import { formatDate, toInstantInZone, todayIn } from '@/lib/format'
import { AppointmentList } from './AppointmentList'
import { CancelDialog } from './CancelDialog'
import { ScheduleFilters } from './ScheduleFilters'

/** Day view per dealership, linkable via `?dealershipId=&date=` (FR-015, research R2). */
export function SchedulePage() {
  const dealerships = useDealerships()
  const [params, setParams] = useSearchParams()
  const [toCancel, setToCancel] = useState<AppointmentView | null>(null)

  const dealership = dealerships.data?.find((d) => d.id === params.get('dealershipId')) ?? dealerships.data?.[0]
  const timeZone = dealership?.timeZone ?? 'UTC'
  const date = params.get('date') ?? (dealership ? todayIn(timeZone) : '')
  const appointments = useAppointments(dealership?.id, date || undefined)

  if (dealerships.isPending) return <LoadingState>Loading dealerships…</LoadingState>
  if (dealerships.isError) return <ErrorState error={dealerships.error} onRetry={() => void dealerships.refetch()} />
  if (!dealership) return <EmptyState>No dealerships configured.</EmptyState>

  const dayLabel = formatDate(toInstantInZone(date, '12:00', timeZone), timeZone)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Schedule</h1>
      <ScheduleFilters
        dealerships={dealerships.data}
        dealershipId={dealership.id}
        date={date}
        onChange={(next) => setParams(next)}
      />
      <section aria-labelledby="day-heading" className="space-y-3">
        <h2 id="day-heading" className="text-base font-semibold">
          {dealership.name} — {dayLabel} <span className="text-sm font-normal text-slate-600">({timeZone})</span>
        </h2>
        {appointments.isPending && <LoadingState>Loading appointments…</LoadingState>}
        {appointments.isError && <ErrorState error={appointments.error} onRetry={() => void appointments.refetch()} />}
        {appointments.isSuccess && appointments.data.length === 0 && <EmptyState>No appointments on this day.</EmptyState>}
        {appointments.isSuccess && appointments.data.length > 0 && (
          <AppointmentList
            appointments={appointments.data}
            timeZone={timeZone}
            caption={`Appointments at ${dealership.name} on ${dayLabel}`}
            onCancel={setToCancel}
          />
        )}
      </section>
      <CancelDialog appointment={toCancel} timeZone={timeZone} onClose={() => setToCancel(null)} />
    </div>
  )
}
