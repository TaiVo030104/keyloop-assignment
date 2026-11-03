import { appointmentHandlers } from './appointments'
import { availabilityHandlers } from './availability'
import { customerHandlers } from './customers'
import { referenceHandlers } from './reference'

export const handlers = [...referenceHandlers, ...customerHandlers, ...availabilityHandlers, ...appointmentHandlers]
