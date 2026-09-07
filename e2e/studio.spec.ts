import { expect, test, type Page } from '@playwright/test'

const WELCOME_SOURCE_LABEL = 'Template source for welcome-verification.email.tsx'
const PAYLOAD_LABEL = 'Preview payload JSON'

/**
 * Playwright evaluates locators inside the sandboxed preview frame, which makes
 * Chromium log this message. It is proof the sandbox works, not an app error;
 * a separate assertion checks the rendered HTML contains no script tags.
 */
const SANDBOX_NOTICE = /Blocked script execution in 'about:srcdoc'/

function previewBody(page: Page) {
  return page.frameLocator('iframe[title^="Email preview"]').locator('body')
}
function sourcePanel(page: Page) {
  return page.getByRole('region', { name: /\.email\.tsx$/ })
}
function payloadPanel(page: Page) {
  return page.getByRole('region', { name: 'Preview payload' })
}
function previewPanel(page: Page) {
  return page.getByRole('region', { name: 'Preview', exact: true })
}

/** Replaces the whole content of a CodeMirror editor. */
async function replaceEditorText(page: Page, label: string, text: string) {
  const editor = page.getByLabel(label)
  await editor.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(text)
}

type PageWithErrors = Page & { __errors?: string[] }

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !SANDBOX_NOTICE.test(message.text())) errors.push(message.text())
  })
  ;(page as PageWithErrors).__errors = errors
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Templates & Studio' })).toBeVisible()
})

test.afterEach(async ({ page }) => {
  expect((page as PageWithErrors).__errors).toEqual([])
})

test('renders the default template in the isolated preview frame', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })
  await expect(previewPanel(page).getByText('Up to date')).toBeVisible()

  const iframe = page.locator('iframe[title^="Email preview"]')
  await expect(iframe).toHaveAttribute('sandbox', '')
  const srcdoc = await iframe.getAttribute('srcdoc')
  expect(srcdoc).toContain('Content-Security-Policy')
  expect(srcdoc).not.toMatch(/<script/i)

  await expect(page.getByRole('button', { name: /Welcome & verification/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('payload edits update the preview and are validated separately from JSON syntax', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })

  await replaceEditorText(
    page,
    PAYLOAD_LABEL,
    JSON.stringify(
      {
        recipientName: 'Zed',
        verificationUrl: 'https://example.test/verify',
        expiresInHours: 6,
        productName: 'Meridian',
        supportEmail: 'help@example.test',
      },
      null,
      2,
    ),
  )
  await expect(previewBody(page)).toContainText('Welcome, Zed', { timeout: 15_000 })
  await expect(payloadPanel(page).getByText('Schema valid')).toBeVisible()

  // Schema-invalid: wrong type, reported by field path.
  await replaceEditorText(page, PAYLOAD_LABEL, '{"recipientName": "Zed", "expiresInHours": "soon"}')
  await expect(payloadPanel(page).getByText('Schema invalid')).toBeVisible()
  await expect(payloadPanel(page).getByText('expiresInHours', { exact: true })).toBeVisible()
  await expect(page.getByText('Preview paused. Fix the preview payload to continue rendering.')).toBeVisible()
  // The last good preview is kept on screen.
  await expect(previewBody(page)).toContainText('Welcome, Zed')

  // Invalid JSON is a different failure mode.
  await replaceEditorText(page, PAYLOAD_LABEL, '{"recipientName": ')
  await expect(payloadPanel(page).getByText('Invalid JSON', { exact: true })).toBeVisible()

  // Reset restores the sample data and the preview recovers.
  await payloadPanel(page).getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Reset payload' }).click()
  await expect(payloadPanel(page).getByText('Schema valid')).toBeVisible()
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })
})

test('source errors are reported without crashing and reset restores the original', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })

  await replaceEditorText(page, WELCOME_SOURCE_LABEL, 'export default function Broken() {\n  return <p>\n}\n')
  await expect(sourcePanel(page).getByText('Compile error')).toBeVisible({ timeout: 15_000 })
  await expect(previewPanel(page).getByText('Showing last good render')).toBeVisible()

  await replaceEditorText(
    page,
    WELCOME_SOURCE_LABEL,
    "import fs from 'node:fs'\nexport default function T() { return null }\n",
  )
  await expect(sourcePanel(page).getByText('Import not allowed')).toBeVisible({ timeout: 15_000 })
  await expect(sourcePanel(page).getByText(/"node:fs" is not available in the studio/)).toBeVisible()

  await sourcePanel(page).getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Reset source' }).click()
  await expect(sourcePanel(page).getByText('Compiled and rendered without errors.')).toBeVisible({
    timeout: 15_000,
  })
  await expect(sourcePanel(page).getByText('Original', { exact: true })).toBeVisible()
})

test('an infinite loop is stopped by the worker timeout and the studio recovers', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })

  await replaceEditorText(
    page,
    WELCOME_SOURCE_LABEL,
    'export default function Loop() {\n  while (true) {}\n}\n',
  )
  await expect(sourcePanel(page).getByText('Render stopped')).toBeVisible({ timeout: 20_000 })
  await expect(sourcePanel(page).getByText(/Rendering was stopped after 5s/)).toBeVisible()

  await replaceEditorText(
    page,
    WELCOME_SOURCE_LABEL,
    "import { Html, Text } from '@react-email/components'\nexport default function Fine() { return <Html><Text>Recovered fine</Text></Html> }\n",
  )
  await expect(previewBody(page)).toContainText('Recovered fine', { timeout: 15_000 })
})

test('network globals are unavailable inside the render worker', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })
  await replaceEditorText(
    page,
    WELCOME_SOURCE_LABEL,
    'export default function Probe() {\n  const names = ["fetch", "XMLHttpRequest", "WebSocket", "importScripts", "Worker"]\n  const present = names.filter((n) => typeof (globalThis as any)[n] !== "undefined")\n  throw new Error("present:[" + present.join(",") + "]")\n}\n',
  )
  await expect(sourcePanel(page).getByText('Render error')).toBeVisible({ timeout: 15_000 })
  await expect(sourcePanel(page).getByText(/present:\[\]/)).toBeVisible()
})

test('drafts survive switching templates and reloading the page', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })
  await replaceEditorText(page, PAYLOAD_LABEL, '{"recipientName": "Draft Person"}')
  await expect(payloadPanel(page).getByText('Schema invalid')).toBeVisible()

  await page.getByRole('button', { name: /Password reset/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'password-reset.email.tsx' })).toBeVisible()
  await expect(previewBody(page)).toContainText('Reset your password', { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /Welcome & verification/ })).toContainText('Modified')

  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: 'password-reset.email.tsx' })).toBeVisible()
  await page.getByRole('button', { name: /Welcome & verification/ }).click()
  await expect(page.getByLabel(PAYLOAD_LABEL)).toContainText('Draft Person')
})

test('device toggle changes the preview viewport', async ({ page }) => {
  const iframe = page.locator('iframe[title^="Email preview"]')
  await expect(iframe).toBeVisible({ timeout: 15_000 })
  const desktopWidth = await iframe.evaluate((element) => element.getBoundingClientRect().width)
  expect(desktopWidth).toBeGreaterThan(375)
  await expect(previewPanel(page).getByText('Desktop · up to 680px')).toBeVisible()

  await page.getByRole('radio', { name: 'Mobile preview' }).click()
  await expect(iframe).toHaveCSS('width', '375px')
  await expect(previewPanel(page).getByText('Mobile · 375px')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Mobile preview' })).toHaveAttribute('aria-checked', 'true')
})

test('send test email and publish are clearly non-functional', async ({ page }) => {
  await expect(previewBody(page)).toContainText('Welcome, Ada', { timeout: 15_000 })

  await page.getByRole('button', { name: 'Send test email' }).click()
  const sendDialog = page.getByRole('dialog', { name: 'Send test email' })
  await expect(sendDialog.getByText('Sending is disabled', { exact: true })).toBeVisible()
  await expect(sendDialog.getByRole('button', { name: /Send test/ })).toBeDisabled()
  // The dialog has two buttons named Close: the icon in the corner and the footer button.
  await sendDialog.getByRole('button', { name: 'Close' }).last().click()

  await page.getByRole('button', { name: 'Publish changes' }).click()
  const publishDialog = page.getByRole('alertdialog')
  await expect(publishDialog.getByText('Simulated')).toBeVisible()
  await publishDialog.getByRole('button', { name: 'Record local snapshot' }).click()
  await expect(page.getByText('Local snapshot recorded. Nothing was published.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Welcome & verification/ })).toContainText('Local snapshot')
})
