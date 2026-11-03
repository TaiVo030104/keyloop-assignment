import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../../tests/setup/renderApp'

const URL = '/schedule?dealershipId=d-london&date=2026-11-04'

describe('Schedule view (US4)', () => {
  it('lists the day in start order with details and status', async () => {
    renderApp(URL)
    const table = await screen.findByRole('table', { name: /Appointments at Keyloop Motors London/ })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]!.textContent?.slice(0, 5))).toEqual(['09:00', '10:00', '11:00', '13:00', '14:00'])
    expect(rows[0]).toHaveTextContent('Jane Smith')
    expect(rows[0]).toHaveTextContent('Oliver Hughes')
    expect(rows[4]).toHaveTextContent('Cancelled')
    expect(within(rows[4]!).queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument()
  })

  it('cancels after explicit confirmation using the keyboard (FR-016, SC-006)', async () => {
    const { user } = renderApp(URL)
    const cancelBtn = await screen.findByRole('button', { name: 'Cancel APT-20261104-S001 for Jane Smith' })
    cancelBtn.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel appointment?' })
    expect(dialog).toHaveTextContent('APT-20261104-S001')
    await user.click(within(dialog).getByRole('button', { name: 'Yes, cancel appointment' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => {
      const row = screen.getByText('APT-20261104-S001').closest('tr')!
      expect(row).toHaveTextContent('Cancelled')
    })
  })

  it('keeping the appointment changes nothing', async () => {
    const { user } = renderApp(URL)
    await user.click(await screen.findByRole('button', { name: 'Cancel APT-20261104-S001 for Jane Smith' }))
    await user.click(await screen.findByRole('button', { name: 'Keep appointment' }))
    expect(screen.getByText('APT-20261104-S001').closest('tr')).toHaveTextContent('Confirmed')
  })

  it('shows the empty state', async () => {
    renderApp('/schedule?dealershipId=d-london&date=2026-11-08')
    expect(await screen.findByText('No appointments on this day.')).toBeInTheDocument()
  })

  it('shows dealership-local times for Saigon (FR-017)', async () => {
    renderApp('/schedule?dealershipId=d-saigon&date=2026-11-04')
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('08:00–09:00')
    expect(screen.getByRole('heading', { name: /Asia\/Ho_Chi_Minh/ })).toBeInTheDocument()
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = renderApp(URL)
    await screen.findByRole('table')
    expect(await axe(container)).toHaveNoViolations()
  })
})
