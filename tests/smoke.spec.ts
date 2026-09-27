import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('Fluxera Smoke Test Suite', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<typeof app.firstWindow>>

  test.beforeAll(async () => {
    // Launch Electron application with built main process
    app = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  test('app launches and displays Fluxera title & branding', async () => {
    const title = await page.title()
    expect(title).toContain('Fluxera')

    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('Turn every connection')
  })

  test('navigation switches between core views correctly', async () => {
    // 1. Navigate to Downloads
    await page.getByRole('button', { name: /Downloads/i }).click()
    await expect(page.getByRole('heading', { name: 'Download Library' })).toBeVisible()

    // 2. Navigate to Networks Center
    await page.getByRole('button', { name: /Networks/i }).click()
    await expect(page.getByRole('heading', { name: 'Network Center' })).toBeVisible()

    // 3. Navigate to Live Monitor
    await page.getByRole('button', { name: /Monitor/i }).click()
    await expect(page.getByText(/Live Command Monitor|No Active Monitoring Session/i)).toBeVisible()

    // 4. Navigate to History
    await page.getByRole('button', { name: /History/i }).click()
    await expect(page.getByRole('heading', { name: 'Download History' })).toBeVisible()

    // 5. Navigate to Settings
    await page.getByRole('button', { name: /Settings/i }).click()
    await expect(page.getByRole('heading', { name: 'Application Settings' })).toBeVisible()

    // 6. Navigate to Diagnostics
    await page.getByRole('button', { name: /Diagnostics/i }).click()
    await expect(page.getByRole('heading', { name: 'Diagnostics & Environment' })).toBeVisible()

    // 7. Navigate to About
    await page.getByRole('button', { name: /About/i }).click()
    await expect(page.getByText('Every connection. One faster download.')).toBeVisible()

    // 8. Return Home
    await page.getByRole('button', { name: /Home/i }).click()
    await expect(page.getByRole('heading', { name: 'Turn every connection' })).toBeVisible()
  })

  test('theme switcher toggles between dark and light modes', async () => {
    const themeBtn = page.getByTitle(/Switch to.*mode/i)
    await expect(themeBtn).toBeVisible()

    // Initial state: dark class present
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)

    // Toggle to Light
    await themeBtn.click()
    await expect(html).not.toHaveClass(/dark/)

    // Toggle back to Dark
    await themeBtn.click()
    await expect(html).toHaveClass(/dark/)
  })

  test('network center displays detected physical interfaces', async () => {
    await page.locator('aside').getByRole('button', { name: /Networks/i }).click()
    const networkCards = page.locator('.rounded-2xl')
    await expect(networkCards.first()).toBeVisible()
  })
})
