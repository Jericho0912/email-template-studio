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
import type { EmailSender, SenderPreflight } from './emailSender.ts'

export const MAX_HTML_BYTES = 500 * 1024
export const TEST_SUBJECT_PREFIX = '[TEST] '
/** Custom header the browser must send; browsers only allow it after a CORS preflight, which this server never grants. */
export const STUDIO_REQUEST_HEADER = 'x-studio-send'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

const sendRequestSchema = z.object({
  to: z.email(),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(200)
    // Header-safe: no control characters (CR/LF would be a header injection in raw MIME).
    // eslint-disable-next-line no-control-regex
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Subject must not contain control characters'),
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

/** How long a preflight result is reused before SES is asked again. */
export const PREFLIGHT_CACHE_MS = 60_000

export function createApp({ config, sender, now = () => Date.now() }: AppDependencies) {
  const app = new Hono()
  const limiter = createRateLimiter(config.enabled ? config.rateLimitPerMinute : 0, now)
  const preflight = createPreflightCache(config, sender, now)

  // Same-machine only. Rejects DNS-rebinding (foreign Host) and cross-site
  // browser requests (foreign Origin) even though the socket is loopback-bound.
  app.use('/api/*', async (c, next) => {
    const problem = rejectForeignRequest(c.req.header('host'), c.req.header('origin'))
    if (problem) return c.json({ status: 'error', code: 'forbidden-origin', message: problem }, 403)
    await next()
  })

  app.get('/api/send-test/status', async (c) => {
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
      preflight: await preflight(),
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

    // Both checks force a CORS preflight for cross-site callers; the server never answers OPTIONS, so browsers refuse.
    if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
      return c.json(
        { status: 'error', code: 'invalid-request', message: 'Content-Type must be application/json.' },
        415,
      )
    }
    if (c.req.header(STUDIO_REQUEST_HEADER) !== '1') {
      return c.json(
        { status: 'error', code: 'invalid-request', message: `Missing ${STUDIO_REQUEST_HEADER} header.` },
        400,
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

    // Compare case-insensitively but send to the exact spelling from the allow-list.
    const to = config.allowedRecipients.find((address) => address.toLowerCase() === request.to.toLowerCase())
    if (to === undefined) {
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

    const subject = /^\[TEST\]/i.test(request.subject)
      ? request.subject
      : `${TEST_SUBJECT_PREFIX}${request.subject}`
    try {
      const receipt = await sender.send({ from: config.from, to, subject, html: request.html })
      console.log(
        `[send-test] ${sender.mode} "${subject}" -> ${to} (template ${request.templateId}) message ${receipt.messageId}`,
      )
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
      console.error('[send-test] provider error', error)
      return c.json(
        {
          status: 'error',
          code: 'provider-error',
          message: `Send failed: ${describeProviderError(error)}`,
        },
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

/** Runs the sender's read-only preflight at most once per cache window. */
function createPreflightCache(config: SendServerConfig, sender: EmailSender | null, now: () => number) {
  let cached: { at: number; result: Promise<SenderPreflight> } | null = null
  return (): Promise<SenderPreflight> => {
    if (!config.enabled || sender === null)
      return Promise.resolve({ ok: false, message: 'Sending is disabled.' })
    if (cached && now() - cached.at < PREFLIGHT_CACHE_MS) return cached.result
    const result = sender.preflight(config.from)
    cached = { at: now(), result }
    // Do not cache failures: a fixed credential or identity should show up on the next check.
    void result.then((outcome) => {
      if (!outcome.ok) cached = null
    })
    return result
  }
}

/** Returns a reason to refuse, or null when Host and Origin (if present) are local. */
export function rejectForeignRequest(host: string | undefined, origin: string | undefined): string | null {
  if (!host || !LOCAL_HOSTNAMES.has(hostnameOf(host)))
    return 'Requests are only accepted from this machine (Host must be localhost).'
  // `Origin: null` comes from opaque contexts (sandboxed iframes, file: pages); nothing legitimate uses it here.
  if (origin) {
    let originHost: string
    try {
      originHost = new URL(origin).hostname
    } catch {
      return 'Origin header is not a valid URL.'
    }
    if (!LOCAL_HOSTNAMES.has(originHost)) return 'Cross-site requests are not accepted.'
  }
  return null
}

function hostnameOf(hostHeader: string): string {
  // "localhost:8787", "127.0.0.1:8787" or "[::1]:8787"
  const bracketed = /^(\[[^\]]+\])(?::\d+)?$/.exec(hostHeader)
  if (bracketed) return bracketed[1]
  return hostHeader.replace(/:\d+$/, '').toLowerCase()
}

/** One line, bounded length: enough for a developer to act on, no stack traces. */
function describeProviderError(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return raw.replace(/\s+/g, ' ').slice(0, 300)
}
