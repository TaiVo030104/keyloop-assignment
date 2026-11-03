import { expect, test } from '@playwright/test'
import { fillBooking, freeWeekday, openApp } from './helpers'

test('V5: two advisors, one EV slot — exactly one booking, the other gets alternatives', async ({ context }) => {
  const day = freeWeekday(9)
  const a = await context.newPage()
  const b = await context.newPage()
  await openApp(a)
  await openApp(b)

  await fillBooking(a, { search: 'emily', customer: 'Emily Johnson', service: 'EV battery check (120 min)', date: day.iso, time: '10:00' })
  await fillBooking(b, { search: 'liam', customer: 'Liam Taylor', service: 'EV battery check (120 min)', date: day.iso, time: '10:00' })
  for (const p of [a, b]) {
    await expect(p.getByRole('status')).toContainText('Technician: Isla Turner')
    await p.getByRole('button', { name: 'Review & confirm' }).click()
  }

  await a.getByRole('dialog').getByRole('button', { name: 'Confirm appointment' }).click()
  await expect(a.getByRole('heading', { name: 'Appointment confirmed' })).toBeVisible()

  const dialogB = b.getByRole('dialog')
  await dialogB.getByRole('button', { name: 'Confirm appointment' }).click()
  await expect(dialogB.getByRole('alert')).toContainText('This slot was just taken.')
  await expect(dialogB.getByRole('alert').getByRole('button').first()).toBeVisible()
  await dialogB.getByRole('button', { name: 'Back' }).click()
  await expect(b.getByRole('combobox', { name: 'Customer' })).toHaveValue('Liam Taylor')

  await b.goto(`/schedule?dealershipId=d-london&date=${day.iso}`)
  await b.waitForFunction(() => window.__mswReady === true)
  await expect(b.getByRole('row').filter({ hasText: '10:00–12:00' })).toHaveCount(1)
})
