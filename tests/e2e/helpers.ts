import { expect, type Page } from '@playwright/test'

/** A Mon–Fri local date (London) at least a week ahead, clear of the seeded appointments. */
export function freeWeekday(offsetDays = 8): { iso: string } {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return { iso: `${y}-${m}-${day}` }
}

export async function openApp(page: Page, path = '/book') {
  await page.goto(path)
  await page.waitForFunction(() => window.__mswReady === true)
  await expect(page.getByLabel('Dealership')).toHaveValue('d-london')
}

export async function fillBooking(
  page: Page,
  opts: { search: string; customer: string; vehicle?: string; service: string; date: string; time: string },
) {
  await page.getByRole('combobox', { name: 'Customer' }).fill(opts.search)
  await page.getByRole('option', { name: new RegExp(opts.customer) }).click()
  if (opts.vehicle) await page.getByLabel('Vehicle').selectOption({ label: opts.vehicle })
  await page.getByLabel('Service type').selectOption({ label: opts.service })
  await page.getByLabel('Date').fill(opts.date)
  await page.getByLabel('Start time').selectOption(opts.time)
}
