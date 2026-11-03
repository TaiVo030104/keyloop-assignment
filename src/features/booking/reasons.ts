import type { UnavailableReason } from '@/api/errors'

export const REASON_TEXT: Record<UnavailableReason, string> = {
  SERVICE_NOT_OFFERED: 'This service is not offered at the selected dealership.',
  START_IN_PAST: 'The requested start time is in the past.',
  DEALERSHIP_CLOSED: 'The dealership is closed on that day.',
  OUTSIDE_OPENING_HOURS: 'The service cannot finish within opening hours.',
  NO_QUALIFIED_TECHNICIAN: 'No qualified technician is free for the whole service.',
  NO_COMPATIBLE_BAY: 'No suitable service bay is free for the whole service.',
  PROPOSED_RESOURCE_TAKEN: 'The proposed technician or bay was just booked by someone else.',
}
