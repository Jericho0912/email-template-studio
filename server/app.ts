/**
 * HTTP API for test sends. Two routes:
 *
 *   GET  /api/send-test/status  -> is sending possible, from where, to whom
 *   POST /api/send-test         -> send one test email (allow-listed recipient only)
 *
 * The browser never sees credentials; it only sees this API. Guards, in order:
 * enabled flag, body validation, recipient allow-list, HTML size cap, rate limit.
 */
import { Hono } from 'hono'
import { z } from 'zod'
import type { SendServerConfig } from './config.ts'
import type { EmailSender } from './emailSender.ts'

export const MAX_HTML_BYTES = 500 * 1024
export const TEST_SUBJECT_PREFIX = '[TEST] '

const sendRequestSchema = z.object({
  to: z.email(),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1),
  templateId: z.string().min(1).max(100),
})

export type SendRequest = z.infer<typeof sendRequestSchema>

export interface AppDependencies {
  readonly config: SendServerConfig
  readonly sender: EmailSender | null
  /** Injectable clock for tests. */
  readonly now?: () => number
}

export function createApp({ config, sender, now = () => Date.now() }: AppDependencies) {
  const app = new Hono()
  const limiter = createRateLimiter(config.enabled ? config.rateLimitPerMinute : 0, now)

  app.get('/api/send-test/status', (c) => {
    if (!config.enabled) {
      return c.json({ enabled: false as const, provider: 'amazon-ses', reason: config.reason })
    }
    return c.json({
      enabled: true as const,
      provider: 'amazon-ses',
      mode: sender?.mode ?? 'dry-run',
      from: config.from,
      allowedRecipients: config.allowedRecipients,
      region: config.region,
      rateLimitPerMinute: config.rateLimitPerMinute,
    })
  })

  app.post('/api/send-test', async (c) => {
    if (!config.enabled || sender === null) {
      return c.json(
        {
          status: 'error',
          code: 'sending-disabled',
          message: config.enabled ? 'No sender configured.' : config.reason,
        },
        503,
      )
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ status: 'error', code: 'invalid-request', message: 'Request body must be JSON.' }, 400)
    }
    const parsed = sendRequestSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return c.json(
        { status: 'error', code: 'invalid-request', message: 'Invalid send request.', issues },
        400,
      )
    }
    const request = parsed.data

    const to = request.to.toLowerCase()
    if (!config.allowedRecipients.includes(to)) {
      return c.json(
        {
          status: 'error',
          code: 'recipient-not-allowed',
          message: `${request.to} is not in SES_ALLOWED_RECIPIENTS.`,
        },
        403,
      )
    }

    if (new TextEncoder().encode(request.html).length > MAX_HTML_BYTES) {
      return c.json(
        {
          status: 'error',
          code: 'invalid-request',
          message: `HTML is larger than ${MAX_HTML_BYTES / 1024} KB.`,
        },
        400,
      )
    }

    if (!limiter.tryAcquire()) {
      return c.json(
        {
          status: 'error',
          code: 'rate-limited',
          message: `Limit of ${config.rateLimitPerMinute} test sends per minute reached. Try again shortly.`,
        },
        429,
      )
    }

    const subject = request.subject.startsWith(TEST_SUBJECT_PREFIX)
      ? request.subject
      : `${TEST_SUBJECT_PREFIX}${request.subject}`
    try {
      const receipt = await sender.send({ from: config.from, to, subject, html: request.html })
      return c.json({
        status: 'sent',
        mode: sender.mode,
        messageId: receipt.messageId,
        to,
        from: config.from,
        subject,
        templateId: request.templateId,
        sentAt: new Date(now()).toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return c.json(
        { status: 'error', code: 'provider-error', message: `Amazon SES rejected the send: ${message}` },
        502,
      )
    }
  })

  return app
}

/** Sliding one-minute window. `limit` 0 means nothing is ever allowed. */
export function createRateLimiter(limit: number, now: () => number) {
  const stamps: number[] = []
  return {
    tryAcquire(): boolean {
      const cutoff = now() - 60_000
      while (stamps.length > 0 && stamps[0] < cutoff) stamps.shift()
      if (stamps.length >= limit) return false
      stamps.push(now())
      return true
    },
  }
}
