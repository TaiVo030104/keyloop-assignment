import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Same handlers as the browser, for Vitest (research R5). */
export const server = setupServer(...handlers)
