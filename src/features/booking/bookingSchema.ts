import { z } from 'zod'

/** UI-only rules for the booking form (research R12). API shapes come from the contract. */
export const bookingSchema = z.object({
  customerId: z.string().min(1, 'Select a customer.'),
  vehicleId: z.string().min(1, 'Select the vehicle to be serviced.'),
  dealershipId: z.string().min(1, 'Select a dealership.'),
  serviceTypeId: z.string().min(1, 'Select a service type.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  time: z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, 'Choose a start time (15-minute steps).'),
})

export type BookingFormValues = z.infer<typeof bookingSchema>

export const emptyBooking: BookingFormValues = {
  customerId: '',
  vehicleId: '',
  dealershipId: '',
  serviceTypeId: '',
  date: '',
  time: '',
}
