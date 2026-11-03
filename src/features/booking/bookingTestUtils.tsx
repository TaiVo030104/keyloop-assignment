import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { renderApp } from '../../../tests/setup/renderApp'

type User = ReturnType<typeof renderApp>['user']

/** Fills the booking form like an advisor would. Test-only helper. */
export async function fillBooking(
  user: User,
  opts: { search?: string; customer?: string; vehicle?: RegExp; service: RegExp; date: string; time: string },
) {
  await waitFor(() => expect(screen.getByLabelText('Dealership')).toHaveValue('d-london'))
  await user.type(screen.getByRole('combobox', { name: 'Customer' }), opts.search ?? 'smith')
  await user.click(await screen.findByRole('option', { name: new RegExp(opts.customer ?? 'Jane Smith') }))
  if (opts.vehicle) {
    const vehicleSelect = screen.getByLabelText('Vehicle')
    const option = within(vehicleSelect).getByRole('option', { name: opts.vehicle })
    await user.selectOptions(vehicleSelect, option)
  }
  const serviceSelect = screen.getByLabelText('Service type')
  await waitFor(() => expect(serviceSelect).toBeEnabled())
  await user.selectOptions(serviceSelect, within(serviceSelect).getByRole('option', { name: opts.service }))
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: opts.date } })
  await user.selectOptions(screen.getByLabelText('Start time'), opts.time)
}

export const statusRegion = () => screen.getByRole('status')
