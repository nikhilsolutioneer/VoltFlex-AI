import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

async function navigate(page: Page, path: string) {
  await page.locator(`.main-navigation a[href="${path}"]`).click()
}

async function noOverflow(page: Page) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    { message: 'The responsive layout should settle without horizontal overflow' },
  ).toBeLessThanOrEqual(1)
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await noOverflow(page)
  await page.screenshot({ path: `test-results/screens/${name}-${testInfo.project.name}.png`, fullPage: true })
}

test('renders the electricity view, chart, image and data disclosure', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'My electricity', exact: true })).toBeVisible()
  await expect(page.locator('.recharts-area-curve')).toBeVisible()
  const chart = await page.getByTestId('power-chart').boundingBox()
  expect(chart?.width).toBeGreaterThan(250)
  expect(chart?.height).toBeGreaterThan(200)
  await expect(page.locator('.solar-teaser img')).toBeVisible()
  expect(await page.locator('.solar-teaser img').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await capture(page, testInfo, 'electricity')
  await page.getByRole('button', { name: 'Illustrative data', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('All figures are illustrative', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('confirms an EV, compares a schedule and saves a persistent draft', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Yes, that is charging', exact: true }).click()
  await page.getByRole('button', { name: 'Compare a later charge', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Compare an option', exact: true })).toBeVisible()
  await page.getByLabel('Charging starts', { exact: true }).selectOption('6')
  await expect(page.getByRole('alert')).toContainText('cannot deliver')
  await expect(page.getByRole('button', { name: 'Save my next step', exact: true })).toBeDisabled()
  await page.getByLabel('Charging starts', { exact: true }).selectOption('23')
  await page.getByLabel('Selected tariff', { exact: true }).selectOption('standard')
  const rows = page.locator('.cost-table tbody tr')
  expect(await rows.nth(1).locator('td').first().innerText()).toBe(await rows.nth(3).locator('td').first().innerText())
  await page.getByLabel('Selected tariff', { exact: true }).selectOption('flex')
  await capture(page, testInfo, 'comparison')
  const csvDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download comparison CSV', exact: true }).click()
  expect((await csvDownload).suggestedFilename()).toBe('ekz-illustrative-comparison.csv')
  await page.getByRole('button', { name: 'Save my next step', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My next step', exact: true })).toBeVisible()
  const firstTask = page.getByRole('checkbox', { name: 'Confirm the charger supports a reliable timer', exact: true })
  await firstTask.check()
  await page.getByLabel('Notes for myself').fill('Check the charger timer before Monday.')
  await page.getByRole('button', { name: 'Save notes', exact: true }).click()
  await capture(page, testInfo, 'next-step')
  await page.reload()
  await expect(firstTask).toBeChecked()
  await expect(page.getByLabel('Notes for myself')).toHaveValue('Check the charger timer before Monday.')
  const planDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download my plan', exact: true }).click()
  expect((await planDownload).suggestedFilename()).toBe('my-ekz-next-step.md')
  await page.getByRole('button', { name: 'Delete draft', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No next step chosen yet.', exact: true })).toBeVisible()
})

test('removes a wrong EV inference without changing measured usage', async ({ page }, testInfo) => {
  await page.goto('/')
  const metrics = await page.locator('.metrics-strip .metric-value').allTextContents()
  await page.getByRole('button', { name: 'No electric car', exact: true }).click()
  expect(await page.locator('.metrics-strip .metric-value').allTextContents()).toEqual(metrics)
  await expect(page.getByText('Your evening peak is still worth understanding.', { exact: true })).toBeVisible()
  await navigate(page, '/opportunities')
  await expect(page.getByRole('heading', { name: 'Move charging out of the evening', exact: true })).toHaveCount(0)
  await capture(page, testInfo, 'opportunities')
  await page.getByRole('tab', { name: 'No investment', exact: true }).click()
  await expect(page.locator('.opportunity-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Find a better-fitting tariff', exact: true })).toBeVisible()
  await navigate(page, '/compare')
  await expect(page.getByRole('alert')).toContainText('Confirm the electric car')
  await expect(page.getByRole('button', { name: 'Save my next step', exact: true })).toBeDisabled()
})

test('supports combined shared equipment and guards a stale plan', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'My household', exact: true }).click()
  await page.getByLabel('Building type', { exact: true }).selectOption('multi')
  await page.getByLabel('Meter covers', { exact: true }).selectOption('building')
  await page.getByLabel('Your role', { exact: true }).selectOption('resident')
  for (const name of ['Electric car', 'Solar PV', 'Home battery', 'Electric water heater']) {
    await page.getByLabel(`${name} status`, { exact: true }).selectOption('confirmed')
  }
  await page.locator('.asset-editor-row').filter({ has: page.getByLabel('Electric car status', { exact: true }) }).getByRole('checkbox').check()
  await capture(page, testInfo, 'household')
  await page.getByRole('button', { name: 'Apply household changes', exact: true }).click()
  await expect(page.locator('.home-summary')).toContainText('Multi-family building')
  await navigate(page, '/compare')
  await expect(page.getByText(/This is a building-level discussion/)).toBeVisible()
  await page.getByRole('button', { name: 'Save assessment plan', exact: true }).click()
  await expect(page.getByText('Approval first', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'My household', exact: true }).click()
  await page.getByLabel('Electric car status', { exact: true }).selectOption('absent')
  await page.getByRole('button', { name: 'Apply household changes', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Your household details changed')
  await expect(page.getByRole('checkbox').first()).toBeDisabled()
  await page.getByRole('button', { name: 'Recompare', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Confirm the electric car')
})

test('shows wider impact and an explicitly hypothetical collective result', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'My impact', exact: true }).click()
  await expect(page.getByTestId('collective-energy')).toContainText('--')
  await page.getByRole('tab', { name: 'My electricity', exact: true }).click()
  await page.getByRole('button', { name: 'Yes, that is charging', exact: true }).click()
  await page.getByRole('tab', { name: 'My impact', exact: true }).click()
  await expect(page.getByTestId('collective-energy')).toContainText('720')
  await page.getByRole('slider', { name: 'Participating households', exact: true }).fill('200')
  await expect(page.getByTestId('collective-energy')).toContainText("1'440")
  await capture(page, testInfo, 'impact')
  await expect(page.getByText(/Not an observed community result/)).toBeVisible()
})

test('updates investment controls and keeps PV direction explicit', async ({ page }, testInfo) => {
  await page.goto('/compare')
  await page.getByLabel('Comparison type', { exact: true }).selectOption('solar')
  const originalCost = await page.locator('.investment-summary strong').first().innerText()
  await page.getByRole('slider', { name: 'Additional solar capacity', exact: true }).fill('7')
  await page.getByRole('checkbox', { name: 'Add a battery', exact: true }).check()
  expect(await page.locator('.investment-summary strong').first().innerText()).not.toBe(originalCost)
  await expect(page.getByRole('slider', { name: 'Additional battery capacity', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save assessment plan', exact: true })).toBeEnabled()
  await capture(page, testInfo, 'solar-storage')
  await page.getByLabel('Comparison type', { exact: true }).selectOption('curtail')
  await expect(page.getByRole('alert')).toContainText('Confirm existing solar')
  await page.getByRole('button', { name: 'My household', exact: true }).click()
  await page.getByLabel('Solar PV status', { exact: true }).selectOption('confirmed')
  await page.getByRole('button', { name: 'Apply household changes', exact: true }).click()
  const curtailment = page.getByRole('slider', { name: 'PV curtailment', exact: true })
  await expect(curtailment).toHaveAttribute('min', '0')
  await expect(curtailment).toHaveAttribute('max', '100')
  await expect(page.getByText(/not raised above available sunlight/)).toBeVisible()
  await curtailment.fill('0')
  await expect(page.locator('.scenario-summary')).toContainText('CHF 0')
})

test('opens the scripted guide and navigates to a grounded comparison', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ask the guide', exact: true }).click()
  await expect(page.getByText('Scripted demo / not a live AI agent', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Question for the energy guide', exact: true }).fill('Which tariff could lower my bill?')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await page.getByRole('button', { name: 'Compare the example tariffs', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Comparison type', { exact: true })).toHaveValue('tariff')
  await expect(page.getByText('Same use. A different price.', { exact: true })).toBeVisible()
})

test('cancels household edits and renders without overflow at narrow and wide sizes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'My household', exact: true }).click()
  await page.getByLabel('Building type', { exact: true }).selectOption('multi')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.home-summary')).toContainText('Single-family home')
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await noOverflow(page)
    await expect(page.locator('.recharts-area-curve')).toBeVisible()
  }
})