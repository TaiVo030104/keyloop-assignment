export const booking = (over: Record<string, unknown> = {}) => ({
  customerId: 'c-01',
  vehicleId: 'v-01a',
  dealershipId: 'd-london',
  serviceTypeId: 'st-brakes',
  start: '2026-11-04T15:00:00Z',
  technicianId: 'lon-t-george',
  bayId: 'lon-bay-1',
  ...over,
})
export const key = () => crypto.randomUUID()
