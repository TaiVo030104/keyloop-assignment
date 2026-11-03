import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from './client'
import type { components } from './schema.gen'

export type Dealership = components['schemas']['Dealership']
export type ServiceType = components['schemas']['ServiceType']
export type Customer = components['schemas']['Customer']
export type Vehicle = components['schemas']['Vehicle']
export type AvailabilityRequest = components['schemas']['AvailabilityRequest']
export type AvailabilityResult = components['schemas']['AvailabilityResult']
export type CreateAppointmentRequest = components['schemas']['CreateAppointmentRequest']
export type AppointmentView = components['schemas']['AppointmentView']
export type AppointmentStatus = components['schemas']['AppointmentStatus']

export const queryKeys = {
  dealerships: ['dealerships'] as const,
  serviceTypes: (dealershipId: string) => ['serviceTypes', dealershipId] as const,
  customers: (q: string) => ['customers', q] as const,
  availability: (req: AvailabilityRequest) => ['availability', req.dealershipId, req.serviceTypeId, req.start] as const,
  appointmentsAll: ['appointments'] as const,
  appointments: (dealershipId: string, date: string) => ['appointments', dealershipId, date] as const,
}

export function useDealerships() {
  return useQuery({
    queryKey: queryKeys.dealerships,
    queryFn: () => unwrap(api.GET('/dealerships')),
    staleTime: 5 * 60_000,
  })
}

export function useServiceTypes(dealershipId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceTypes(dealershipId ?? ''),
    queryFn: () =>
      unwrap(api.GET('/dealerships/{dealershipId}/service-types', { params: { path: { dealershipId: dealershipId! } } })),
    enabled: !!dealershipId,
    staleTime: 5 * 60_000,
  })
}

export function useCustomerSearch(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: queryKeys.customers(term),
    queryFn: () => unwrap(api.GET('/customers', { params: { query: { q: term, limit: 10 } } })),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Availability for a complete request; disabled (no request sent) while `req` is undefined. */
export function useAvailability(req: AvailabilityRequest | undefined) {
  return useQuery({
    queryKey: req ? queryKeys.availability(req) : ['availability', 'idle'],
    queryFn: () => unwrap(api.POST('/availability/check', { body: req! })),
    enabled: !!req,
    staleTime: 5_000,
    retry: 1,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateAppointmentRequest; idempotencyKey: string }) =>
      unwrap(api.POST('/appointments', { body, params: { header: { 'Idempotency-Key': idempotencyKey } } })),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointmentsAll })
      void qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

export function useAppointments(dealershipId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments(dealershipId ?? '', date ?? ''),
    queryFn: () => unwrap(api.GET('/appointments', { params: { query: { dealershipId: dealershipId!, date: date! } } })),
    enabled: !!dealershipId && !!date,
  })
}

export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (appointmentId: string) =>
      unwrap(api.POST('/appointments/{appointmentId}/cancel', { params: { path: { appointmentId } } })),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.appointmentsAll })
      void qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
