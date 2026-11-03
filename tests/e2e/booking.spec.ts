import { expect, test } from '@playwright/test'
import { fillBooking, freeWeekday, openApp } from './helpers'

test('V1: book an available slot, confirm, and find it after reload', async ({ page }) => {
  const day = freeWeekday()
  await openApp(page)
  await fillBooking(page, {
    search: 'smith',
    customer: 'Jane Smith',
    vehicle: '2022 Toyota Corolla · JTDBR32E720123456',
    service: 'Brake service (90 min)',
    date: day.iso,
    time: '10:00',
  })

  const status = page.getByRole('status')
  await expect(status).toContainText('Available')
  await expect(status).toContainText('10:00–11:30')
  await expect(status).toContainText('Technician: George Patel')

  await page.getByRole('button', { name: 'Review & confirm' }).click()
  await page.getByRole('dialog', { name: 'Review appointment' }).getByRole('button', { name: 'Confirm appointment' }).click()
  await expect(page.getByRole('heading', { name: 'Appointment confirmed' })).toBeVisible()
  const reference = (await page.getByTestId('appointment-reference').textContent())!
  expect(reference).toMatch(/^APT-\d{8}-[A-Z0-9]{4}$/)

  await page.getByRole('link', { name: 'View schedule for this day' }).click()
  await expect(page).toHaveURL(new RegExp(`/schedule\\?dealershipId=d-london&date=${day.iso}`))
  await page.reload()
  await page.waitForFunction(() => window.__mswReady === true)
  const row = page.getByRole('row', { name: new RegExp(reference) })
  await expect(row).toContainText('10:00–11:30')
  await expect(row).toContainText('Jane Smith')
  await expect(row).toContainText('George Patel')
  await expect(row).toContainText('Confirmed')
})

test('V7: cancel frees the slot for a new booking', async ({ page }) => {
  await openApp(page)
  // Seeded EV appointment (Isla, 13:00–15:00) is on the next weekday — find it via the schedule.
  await page.getByRole('link', { name: 'Schedule' }).click()
  const seeded = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('kss:db:v1')!) as { appointments: { id: string; reference: string; start: string; serviceTypeId: string }[] }
    return db.appointments.find((a) => a.serviceTypeId === 'st-ev' && a.id === 'seed-apt-04')!
  })
  const date = seeded.reference.slice(4, 12).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  await page.goto(`/schedule?dealershipId=d-london&date=${date}`)
  await page.waitForFunction(() => window.__mswReady === true)
  await page.getByRole('button', { name: `Cancel ${seeded.reference} for Emily Johnson` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, cancel appointment' }).click()
  await expect(page.getByRole('row', { name: new RegExp(seeded.reference) })).toContainText('Cancelled')

  await page.getByRole('link', { name: 'Book appointment' }).click()
  await fillBooking(page, { search: 'liam', customer: 'Liam Taylor', service: 'EV battery check (120 min)', date, time: '13:00' })
  await expect(page.getByRole('status')).toContainText('Technician: Isla Turner')
})
