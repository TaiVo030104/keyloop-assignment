import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { memorySink } from '@/observability/logger'
import { renderApp } from '../../../tests/setup/renderApp'
import { call } from '../../../tests/contract/validator'
import { fillBooking, statusRegion } from './bookingTestUtils'

async function openReviewForEv(user: ReturnType<typeof renderApp>['user']) {
  await fillBooking(user, { search: 'emily', customer: 'Emily Johnson', service: /EV battery check/, date: '2026-11-04', time: '15:00' })
  await waitFor(() => expect(statusRegion()).toHaveTextContent('Technician: Isla Turner'), { timeout: 3000 })
  await user.click(screen.getByRole('button', { name: 'Review & confirm' }))
  return screen.findByRole('dialog', { name: 'Review appointment' })
}

describe('Concurrent booking (US3)', () => {
  it('second advisor gets "slot was just taken" with alternatives and keeps selections', async () => {
    const { user } = renderApp('/book')
    const dialog = await openReviewForEv(user)

    // Another advisor books the same EV technician/bay first.
    const other = await call('POST', '/appointments', {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: {
        customerId: 'c-01',
        vehicleId: 'v-01b',
        dealershipId: 'd-london',
        serviceTypeId: 'st-ev',
        start: '2026-11-04T15:00:00Z',
        technicianId: 'lon-t-isla',
        bayId: 'lon-bay-ev',
      },
    })
    expect(other.status).toBe(201)

    await user.click(within(dialog).getByRole('button', { name: 'Confirm appointment' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('This slot was just taken.')
    expect(alert).toHaveTextContent('Your selections are kept')
    const alternatives = within(alert).getAllByRole('button')
    expect(alternatives.length).toBeGreaterThan(0)
    expect(memorySink.events.some((e) => e.event === 'booking.conflict')).toBe(true)

    await user.click(alternatives[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue('Emily Johnson')
    expect(screen.getByLabelText('Service type')).toHaveValue('st-ev')
    await waitFor(() => expect(statusRegion()).toHaveTextContent('Technician: Isla Turner'), { timeout: 3000 })
    expect(screen.getByLabelText('Start time')).not.toHaveValue('15:00')

    const list = (await call('GET', '/appointments?dealershipId=d-london&date=2026-11-04&status=CONFIRMED')).body as { start: string }[]
    expect(list.filter((a) => a.start === '2026-11-04T15:00:00Z')).toHaveLength(1)
  })

  it('retry after a server error reuses the Idempotency-Key and creates exactly one appointment', async () => {
    const keys: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname === '/api/appointments') {
        keys.push(request.headers.get('Idempotency-Key') ?? '')
      }
    })
    const { setChaos } = await import('@/mocks/chaos')
    const { user } = renderApp('/book')
    const dialog = await openReviewForEv(user)

    setChaos({ failNext: true })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm appointment' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Could not confirm the appointment')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Appointment confirmed' })).toBeInTheDocument()

    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
    server.events.removeAllListeners()
    const list = (await call('GET', '/appointments?dealershipId=d-london&date=2026-11-04&status=CONFIRMED')).body as { start: string }[]
    expect(list.filter((a) => a.start === '2026-11-04T15:00:00Z')).toHaveLength(1)
  })
})
