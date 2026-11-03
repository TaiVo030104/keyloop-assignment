import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { memorySink } from '@/observability/logger'
import { renderApp } from '../../../tests/setup/renderApp'
import { fillBooking, statusRegion } from './bookingTestUtils'

const availabilityCalls = () => memorySink.events.filter((e) => e.event === 'api.request' && e.operation === '/availability/check')

describe('Booking flow (US1)', () => {
  it('explains what is missing and sends no availability request (US1 scenario 4)', async () => {
    const { user } = renderApp('/book')
    await waitFor(() => expect(screen.getByLabelText('Dealership')).toHaveValue('d-london'))
    await user.click(screen.getByRole('button', { name: 'Check availability' }))
    expect(await screen.findByText('Select a customer.')).toBeInTheDocument()
    expect(screen.getByText('Select the vehicle to be serviced.')).toBeInTheDocument()
    expect(screen.getByText('Select a service type.')).toBeInTheDocument()
    expect(screen.getByText('Choose a start time (15-minute steps).')).toBeInTheDocument()
    expect(screen.getByLabelText('Vehicle')).toHaveAttribute('aria-invalid', 'true')
    expect(statusRegion()).toHaveTextContent('Complete the booking details')
    expect(availabilityCalls()).toHaveLength(0)
  })

  it('shows availability with end time and resources, then confirms with a reference (US1 scenarios 1–2)', async () => {
    const { user } = renderApp('/book')
    await fillBooking(user, { vehicle: /Corolla/, service: /Brake service \(90 min\)/, date: '2026-11-04', time: '15:00' })

    await waitFor(() => expect(statusRegion()).toHaveTextContent('Available'), { timeout: 3000 })
    expect(statusRegion()).toHaveTextContent('15:00–16:30')
    expect(statusRegion()).toHaveTextContent('Technician: George Patel')
    expect(statusRegion()).toHaveTextContent('Bay: Bay 1')
    expect(availabilityCalls()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Review & confirm' }))
    const dialog = await screen.findByRole('dialog', { name: 'Review appointment' })
    expect(within(dialog).getByText('Jane Smith')).toBeInTheDocument()
    expect(within(dialog).getByText(/2022 Toyota Corolla/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Confirm appointment' }))

    expect(await screen.findByRole('heading', { name: 'Appointment confirmed' })).toHaveFocus()
    expect(screen.getByTestId('appointment-reference').textContent).toMatch(/^APT-20261104-[A-Z0-9]{4}$/)
    expect(screen.getByRole('link', { name: 'View schedule for this day' })).toHaveAttribute(
      'href',
      '/schedule?dealershipId=d-london&date=2026-11-04',
    )
    expect(memorySink.events.some((e) => e.event === 'booking.confirmed')).toBe(true)
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = renderApp('/book')
    await waitFor(() => expect(screen.getByLabelText('Dealership')).toHaveValue('d-london'))
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('Alternatives (US2)', () => {
  it('unavailable → reason + alternatives; picking one makes it available', async () => {
    const { user } = renderApp('/book')
    await fillBooking(user, { search: 'emily', customer: 'Emily Johnson', service: /EV battery check/, date: '2026-11-04', time: '13:30' })

    await waitFor(() => expect(statusRegion()).toHaveTextContent('Not available'), { timeout: 3000 })
    expect(statusRegion()).toHaveTextContent('No qualified technician is free')
    const list = screen.getByRole('list', { name: 'Nearest available start times' })
    const options = within(list).getAllByRole('button')
    expect(options.length).toBeGreaterThan(0)
    expect(options.length).toBeLessThanOrEqual(5)

    await user.click(options[0]!)
        await waitFor(() => expect(statusRegion()).toHaveTextContent('Technician: Isla Turner'), { timeout: 3000 })
    expect(screen.getByRole('button', { name: 'Review & confirm' })).toBeInTheDocument()
  })

  it('says so explicitly when there is no alternative within 7 days', async () => {
    server.use(
      http.post('*/api/availability/check', () =>
        HttpResponse.json({
          available: false,
          window: { start: '2026-11-04T10:00:00Z', end: '2026-11-04T12:00:00Z' },
          reason: 'NO_QUALIFIED_TECHNICIAN',
          alternatives: [],
        }),
      ),
    )
    const { user } = renderApp('/book')
    await fillBooking(user, { search: 'emily', customer: 'Emily Johnson', service: /EV battery check/, date: '2026-11-04', time: '10:00' })
    expect(await screen.findByText('No availability in the next 7 days for this service.', {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('outside opening hours reason (US2 scenario 2)', async () => {
    const { user } = renderApp('/book')
    await fillBooking(user, { vehicle: /Corolla/, service: /Brake service/, date: '2026-11-04', time: '17:00' })
    await waitFor(() => expect(statusRegion()).toHaveTextContent('cannot finish within opening hours'), { timeout: 3000 })
  })

  it('shows an error with retry when the check fails, keeping entered data (FR-018)', async () => {
    const { setChaos } = await import('@/mocks/chaos')
    const { user } = renderApp('/book')
    await fillBooking(user, { vehicle: /Corolla/, service: /Brake service/, date: '2026-11-04', time: '15:00' })
    // Persistent outage (a single 500 is retried automatically once by the query).
    setChaos({ failureRate: 1 }) // availability request is still debounced at this point
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent('Could not check availability')
    expect(alert).toHaveTextContent(/Reference: [0-9a-f-]{36}/)
    setChaos({ failureRate: 0 })
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(statusRegion()).toHaveTextContent('Technician: George Patel'), { timeout: 3000 })
    expect(screen.getByLabelText('Start time')).toHaveValue('15:00')
  })
})

describe('Vehicle selection', () => {
  it("auto-selects a customer's only vehicle", async () => {
    const { user } = renderApp('/book')
    await waitFor(() => expect(screen.getByLabelText('Dealership')).toHaveValue('d-london'))
    await user.type(screen.getByRole('combobox', { name: 'Customer' }), 'hannah')
    await user.click(await screen.findByRole('option', { name: /Hannah Davies/ }))
    await waitFor(() => expect(screen.getByLabelText('Vehicle')).toHaveValue('v-10a'))
  })
})
