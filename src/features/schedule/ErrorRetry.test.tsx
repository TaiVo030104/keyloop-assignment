import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { memorySink } from '@/observability/logger'
import { renderApp } from '../../../tests/setup/renderApp'

describe('Errors and observability (FR-018, FR-019)', () => {
  it('500 → error state with reference id → retry loads the list', async () => {
    const { setChaos } = await import('@/mocks/chaos')
    // dealerships request succeeds, the appointments request fails once
    const { user } = renderApp('/schedule?dealershipId=d-london&date=2026-11-04')
    await screen.findByRole('heading', { name: 'Schedule' })
    setChaos({ failNext: true })
    // Switch day so the next appointments request hits the injected failure.
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-05' } })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The server had a problem')
    const ref = alert.textContent!.match(/Reference: ([0-9a-f-]{36})/)![1]

    const logged = memorySink.events.find((e) => e.event === 'api.request' && e.status === 500)
    expect(logged).toMatchObject({ operation: '/appointments', correlationId: ref })
    expect(logged?.traceId).toMatch(/^[0-9a-f]{32}$/)

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No appointments on this day.')).toBeInTheDocument()
  })
})
