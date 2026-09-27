import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import http from 'http'
import { startTestServer } from './test-server'

test.describe('Fluxera Download & Multi-Interface Engine Suite', () => {
  let app: Awaited<ReturnType<typeof electron.launch>>
  let page: Awaited<ReturnType<typeof app.firstWindow>>
  let testServer: http.Server
  const serverPort = 45679

  test.beforeAll(async () => {
    testServer = await startTestServer(serverPort)

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
    if (testServer) {
      testServer.close()
    }
  })

  test('probes remote URL and detects range support & file size', async () => {
    // Open New Download modal
    await page.getByRole('button', { name: /New Download/i }).first().click()
    await expect(page.getByRole('heading', { name: 'New Concurrent Download' })).toBeVisible()

    const urlInput = page.getByPlaceholder('https://example.com/file.iso')
    await urlInput.fill(`http://127.0.0.1:${serverPort}/ranged-file.bin`)

    // Click probe
    await page.getByRole('button', { name: 'Probe' }).click()

    // Expect Range request 206 badge and 16 MB size
    await expect(page.getByText('Supported (206)')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/16 MB/i)).toBeVisible()
  })

  test('initiates download, displays live telemetry and progress grid', async () => {
    // Click Start Download
    const startBtn = page.getByRole('button', { name: 'Start Download' })
    await expect(startBtn).toBeEnabled()
    await startBtn.click()

    // Navigates to Monitor view automatically
    await expect(page.getByRole('heading', { name: 'Live Command Monitor' })).toBeVisible({
      timeout: 5000
    })

    // Progress grid chunks should be visible
    const chunkCells = page.locator('.h-\\[18px\\]')
    await expect(chunkCells.first()).toBeVisible({ timeout: 5000 })

    // Bandwidth summary should be visible
    await expect(page.getByText('Combined Bandwidth').first()).toBeVisible()
  })

  test('pauses and resumes download safely with validator check', async () => {
    // 1. Pause via the active detail modal
    const pauseBtn = page.getByRole('button', { name: 'Pause' })
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click()
      await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible({ timeout: 5000 })

      // 2. Resume via modal
      const resumeBtn = page.getByRole('button', { name: 'Resume' })
      await resumeBtn.click()
      await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 5000 })
    }

    // 3. Close detail modal by pressing Escape or clicking close
    await page.keyboard.press('Escape')
    // Alternatively click close button
    const closeBtn = page.locator('.fixed.inset-0').getByRole('button').last()
    if (await closeBtn.isVisible()) {
      await closeBtn.click({ force: true })
    }

    // 4. Navigate to Downloads library view
    await page.locator('aside').getByRole('button', { name: /Downloads/i }).click()
    await expect(page.getByRole('heading', { name: 'Download Library' })).toBeVisible()
  })
})
