import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  useAvailability,
  useDealerships,
  useServiceTypes,
  type AppointmentView,
  type AvailabilityRequest,
  type CreateAppointmentRequest,
  type Customer,
} from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Field, inputClass } from '@/components/ui/field'
import { ErrorState, LoadingState } from '@/components/ui/status'
import { TIME_OPTIONS, splitInZone, toInstantInZone, todayIn } from '@/lib/format'
import { track } from '@/observability/telemetry'
import { AvailabilityPanel, type AvailabilityState } from './AvailabilityPanel'
import { BookingSuccess } from './BookingSuccess'
import { CustomerCombobox, fullName } from './CustomerCombobox'
import { ReviewDialog, type ReviewSummary } from './ReviewDialog'
import { bookingSchema, emptyBooking, type BookingFormValues } from './bookingSchema'
import { useDebouncedValue } from './useDebouncedValue'

export const AVAILABILITY_DEBOUNCE_MS = 300

export function BookingPage() {
  const dealerships = useDealerships()
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: emptyBooking,
    mode: 'onTouched',
  })
  const { register, control, setValue, formState, handleSubmit, reset } = form
  const values = useWatch({ control }) as BookingFormValues
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [comboKey, setComboKey] = useState(0)
  const [review, setReview] = useState<{ request: CreateAppointmentRequest; summary: ReviewSummary } | null>(null)
  const [confirmed, setConfirmed] = useState<AppointmentView | null>(null)

  const dealership = dealerships.data?.find((d) => d.id === values.dealershipId)
  const timeZone = dealership?.timeZone ?? 'UTC'
  const serviceTypes = useServiceTypes(values.dealershipId || undefined)
  const serviceType = serviceTypes.data?.find((s) => s.id === values.serviceTypeId)
  const vehicle = customer?.vehicles.find((v) => v.id === values.vehicleId)

  // Default to the first dealership and today's date in its zone.
  useEffect(() => {
    const first = dealerships.data?.[0]
    if (first && !values.dealershipId) {
      setValue('dealershipId', first.id)
      if (!values.date) setValue('date', todayIn(first.timeZone))
    }
  }, [dealerships.data, values.dealershipId, values.date, setValue])

  // Only a complete, valid form produces an availability request (US1 scenario 4).
  const requestKey = useMemo(() => {
    if (!dealership || !bookingSchema.safeParse(values).success) return ''
    const req: AvailabilityRequest = {
      dealershipId: values.dealershipId,
      serviceTypeId: values.serviceTypeId,
      start: toInstantInZone(values.date, values.time, dealership.timeZone),
    }
    return JSON.stringify(req)
  }, [dealership, values])
  const debouncedKey = useDebouncedValue(requestKey, AVAILABILITY_DEBOUNCE_MS)
  const request = useMemo(() => (debouncedKey ? (JSON.parse(debouncedKey) as AvailabilityRequest) : undefined), [debouncedKey])
  const availability = useAvailability(request)

  useEffect(() => {
    if (availability.data && request) {
      track('availability.checked', {
        dealershipId: request.dealershipId,
        serviceTypeId: request.serviceTypeId,
        available: availability.data.available,
        reason: availability.data.available ? undefined : availability.data.reason,
      })
    }
  }, [availability.data, availability.dataUpdatedAt, request])

  const state: AvailabilityState = !requestKey
    ? { kind: 'idle' }
    : requestKey !== debouncedKey || availability.isPending || (availability.isFetching && !availability.data)
      ? { kind: 'loading' }
      : availability.isError
        ? { kind: 'error', error: availability.error, retry: () => void availability.refetch() }
        : availability.data
          ? { kind: 'result', result: availability.data }
          : { kind: 'loading' }

  const pickAlternative = (start: string) => {
    const { date, time } = splitInZone(start, timeZone)
    setValue('date', date, { shouldValidate: true })
    setValue('time', time, { shouldValidate: true })
  }

  const selectCustomer = (c: Customer | null) => {
    setCustomer(c)
    setValue('customerId', c?.id ?? '', { shouldValidate: !!c })
    setValue('vehicleId', '', { shouldValidate: false })
  }

  // Auto-select a customer's only vehicle once its <option> is rendered (setting it in the
  // same tick as the customer leaves the DOM <select> empty).
  useEffect(() => {
    if (customer?.vehicles.length === 1 && !values.vehicleId) {
      setValue('vehicleId', customer.vehicles[0]!.id, { shouldValidate: true })
    }
  }, [customer, values.vehicleId, setValue])

  const bookAnother = () => {
    reset({ ...emptyBooking, dealershipId: values.dealershipId, date: values.date })
    setCustomer(null)
    setComboKey((k) => k + 1)
    setConfirmed(null)
  }

  if (dealerships.isPending) return <LoadingState>Loading dealerships…</LoadingState>
  if (dealerships.isError) return <ErrorState error={dealerships.error} onRetry={() => void dealerships.refetch()} />

  if (confirmed) return <BookingSuccess appointment={confirmed} timeZone={timeZone} onBookAnother={bookAnother} />

  const errors = formState.errors

  /** Snapshot what the advisor reviews, so a later refetch cannot change it under them (FR-009). */
  const openReview = () => {
    const r = state.kind === 'result' && state.result.available ? state.result : undefined
    if (!r || !customer || !vehicle || !serviceType || !dealership) return
    setReview({
      request: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        dealershipId: dealership.id,
        serviceTypeId: serviceType.id,
        start: r.window.start,
        technicianId: r.technician.id,
        bayId: r.bay.id,
      },
      summary: {
        customerName: fullName(customer),
        vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.vin}`,
        serviceTypeName: serviceType.name,
        dealershipName: dealership.name,
        timeZone,
        window: r.window,
        technicianName: r.technician.name,
        bayName: r.bay.name,
      },
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <form
        noValidate
        aria-labelledby="booking-heading"
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit(() => void availability.refetch())}
      >
        <h1 id="booking-heading" className="text-xl font-semibold">
          Book a service appointment
        </h1>

        <Controller
          control={control}
          name="customerId"
          render={() => (
            <Field id="customer" label="Customer" error={errors.customerId?.message}>
              {(aria) => (
                <CustomerCombobox
                  key={comboKey}
                  id={aria.id}
                  value={customer}
                  onChange={selectCustomer}
                  invalid={aria['aria-invalid']}
                  describedBy={aria['aria-describedby']}
                />
              )}
            </Field>
          )}
        />

        <Field id="vehicle" label="Vehicle" error={errors.vehicleId?.message} hint={customer ? undefined : 'Select a customer first.'}>
          {(aria) => (
            <select {...aria} {...register('vehicleId')} className={inputClass} disabled={!customer}>
              <option value="">Select a vehicle…</option>
              {customer?.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} · {v.vin}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dealership" label="Dealership" error={errors.dealershipId?.message}>
            {(aria) => (
              <select
                {...aria}
                {...register('dealershipId', { onChange: () => setValue('serviceTypeId', '') })}
                className={inputClass}
              >
                <option value="">Select a dealership…</option>
                {dealerships.data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="serviceType" label="Service type" error={errors.serviceTypeId?.message}>
            {(aria) => (
              <select {...aria} {...register('serviceTypeId')} className={inputClass} disabled={!serviceTypes.data}>
                <option value="">{serviceTypes.isFetching ? 'Loading…' : 'Select a service…'}</option>
                {serviceTypes.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        {serviceTypes.isError && <ErrorState error={serviceTypes.error} onRetry={() => void serviceTypes.refetch()} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="date"
            label="Date"
            error={errors.date?.message}
            hint={dealership ? `Dealership local time (${dealership.timeZone}), open ${dealership.openingHours.open}–${dealership.openingHours.close}` : undefined}
          >
            {(aria) => <input {...aria} type="date" {...register('date')} className={inputClass} />}
          </Field>
          <Field id="time" label="Start time" error={errors.time?.message}>
            {(aria) => (
              <select {...aria} {...register('time')} className={inputClass}>
                <option value="">Select a time…</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Button type="submit" variant="secondary">
          Check availability
        </Button>
      </form>

      <div>
        <AvailabilityPanel state={state} timeZone={timeZone} onReview={openReview} onPickAlternative={pickAlternative} />
      </div>

      {review && (
        <ReviewDialog
          open
          onOpenChange={(open) => !open && setReview(null)}
          request={review.request}
          summary={review.summary}
          onConfirmed={(a) => {
            setReview(null)
            setConfirmed(a)
          }}
          onPickAlternative={pickAlternative}
        />
      )}
    </div>
  )
}
