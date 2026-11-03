import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { freeWeekday, openApp } from './helpers'

test('V9: complete a booking using only the keyboard', async ({ page }) => {
  const day = freeWeekday(10)
  await openApp(page)
  const kb = page.keyboard

  await page.getByRole('combobox', { name: 'Customer' }).focus()
  await kb.type('hannah')
  await expect(page.getByRole('option', { name: /Hannah Davies/ })).toBeVisible()
  await kb.press('Enter')
  await expect(page.getByRole('combobox', { name: 'Customer' })).toHaveValue('Hannah Davies')
  await expect(page.getByLabel('Vehicle')).toHaveValue('v-10a') // single vehicle auto-selected

  await kb.press('Tab') // vehicle
  await kb.press('Tab') // dealership
  await kb.press('Tab') // service type
  await expect(page.getByLabel('Service type')).toBeFocused()
  await kb.type('Oil')
  await expect(page.getByLabel('Service type')).toHaveValue('st-oil')
  await kb.press('Tab')
  await expect(page.getByLabel('Date')).toBeFocused()
  // Native date field segment order follows the OS locale: probe the first segment, then type.
  const [y, m, d] = day.iso.split('-') as [string, string, string]
  const date = page.getByLabel('Date')
  await kb.type('01')
  const dayFirst = (await date.inputValue()).endsWith('-01')
  await date.blur()
  await date.focus()
  await kb.type(dayFirst ? `${d}${m}${y}` : `${m}${d}${y}`)
  await expect(page.getByLabel('Date')).toHaveValue(day.iso)
  // Tab may first walk the remaining date segments.
  for (let i = 0; i < 3 && !(await page.getByLabel('Start time').evaluate((el) => el === document.activeElement)); i++) {
    await kb.press('Tab')
  }
  await expect(page.getByLabel('Start time')).toBeFocused()
  await kb.type('11:00')
  await expect(page.getByLabel('Start time')).toHaveValue('11:00')

  await expect(page.getByRole('status')).toContainText('Available')
  await page.getByRole('button', { name: 'Review & confirm' }).focus()
  await kb.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Review appointment' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirm appointment' }).focus()
  await kb.press('Enter')
  await expect(page.getByRole('heading', { name: 'Appointment confirmed' })).toBeFocused()
})

for (const path of ['/book', '/schedule?dealershipId=d-london']) {
  test(`axe: no serious or critical violations on ${path}`, async ({ page }) => {
    await openApp(page, path.startsWith('/book') ? path : '/book')
    if (!path.startsWith('/book')) {
      await page.goto(path)
      await page.waitForFunction(() => window.__mswReady === true)
      await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible()
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  })
}
