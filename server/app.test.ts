import { describe, expect, it, vi } from 'vitest'
import { createApp, createRateLimiter, MAX_HTML_BYTES, TEST_SUBJECT_PREFIX } from './app.ts'
import type { SendServerConfig } from './config.ts'
import { createDryRunSender, type EmailSender } from './emailSender.ts'

const enabledConfig: SendServerConfig = {
  enabled: true,
  port: 8787,
  dryRun: true,
  region: 'us-east-1',
  from: 'sender@example.com',
  allowedRecipients: ['qa@example.com'],
  rateLimitPerMinute: 2,
}

const validBody = {
  to: 'qa@example.com',
  subject: 'Hello',
  html: '<p>hi</p>',
  templateId: 'welcome-verification',
}

function post(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request('/api/send-test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('send server API', () => {
  it('reports a disabled server and refuses to send', async () => {
    const app = createApp({ config: { enabled: false, port: 8787, reason: 'off' }, sender: null })
    const status = await app.request('/api/send-test/status')
    expect(await status.json()).toEqual({ enabled: false, provider: 'amazon-ses', reason: 'off' })
    const response = await post(app, validBody)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ status: 'error', code: 'sending-disabled' })
  })

  it('reports an enabled server without leaking anything but from/recipients/region', async () => {
    const app = createApp({ config: enabledConfig, sender: createDryRunSender(() => {}) })
    const body = await (await app.request('/api/send-test/status')).json()
    expect(body).toEqual({
      enabled: true,
      provider: 'amazon-ses',
      mode: 'dry-run',
      from: 'sender@example.com',
      allowedRecipients: ['qa@example.com'],
      region: 'us-east-1',
      rateLimitPerMinute: 2,
    })
  })

  it('validates the body', async () => {
    const app = createApp({ config: enabledConfig, sender: createDryRunSender(() => {}) })
    expect((await post(app, '{not json')).status).toBe(400)
    const response = await post(app, { ...validBody, to: 'nope' })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      status: 'error',
      code: 'invalid-request',
      issues: [{ path: 'to' }],
    })
  })

  it('refuses recipients outside the allow-list, case-insensitively', async () => {
    const app = createApp({ config: enabledConfig, sender: createDryRunSender(() => {}) })
    const refused = await post(app, { ...validBody, to: 'someone-else@example.com' })
    expect(refused.status).toBe(403)
    expect(await refused.json()).toMatchObject({ code: 'recipient-not-allowed' })
    const accepted = await post(app, { ...validBody, to: 'QA@example.com' })
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toMatchObject({ to: 'qa@example.com' })
  })

  it('caps the HTML size', async () => {
    const app = createApp({ config: enabledConfig, sender: createDryRunSender(() => {}) })
    const response = await post(app, { ...validBody, html: 'x'.repeat(MAX_HTML_BYTES + 1) })
    expect(response.status).toBe(400)
  })

  it('sends through the sender with the [TEST] prefix and the configured from address', async () => {
    const sent: unknown[] = []
    const sender: EmailSender = {
      mode: 'live',
      async send(email) {
        sent.push(email)
        return { messageId: 'ses-123' }
      },
    }
    const app = createApp({ config: enabledConfig, sender, now: () => 1_700_000_000_000 })
    const response = await post(app, { ...validBody, subject: 'Verify your email' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'sent',
      mode: 'live',
      messageId: 'ses-123',
      to: 'qa@example.com',
      from: 'sender@example.com',
      subject: `${TEST_SUBJECT_PREFIX}Verify your email`,
      templateId: 'welcome-verification',
      sentAt: '2023-11-14T22:13:20.000Z',
    })
    expect(sent).toEqual([
      {
        from: 'sender@example.com',
        to: 'qa@example.com',
        subject: '[TEST] Verify your email',
        html: '<p>hi</p>',
      },
    ])
  })

  it('surfaces provider failures as 502 without crashing', async () => {
    const sender: EmailSender = {
      mode: 'live',
      send: vi.fn(async () => {
        throw new Error('Email address is not verified')
      }),
    }
    const app = createApp({ config: enabledConfig, sender })
    const response = await post(app, validBody)
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ code: 'provider-error', message: /not verified/ })
  })

  it('rate limits per minute', async () => {
    let clock = 0
    const app = createApp({ config: enabledConfig, sender: createDryRunSender(() => {}), now: () => clock })
    expect((await post(app, validBody)).status).toBe(200)
    expect((await post(app, validBody)).status).toBe(200)
    expect((await post(app, validBody)).status).toBe(429)
    clock += 61_000
    expect((await post(app, validBody)).status).toBe(200)
  })
})

describe('createRateLimiter', () => {
  it('never allows when the limit is zero', () => {
    expect(createRateLimiter(0, () => 0).tryAcquire()).toBe(false)
  })
})
