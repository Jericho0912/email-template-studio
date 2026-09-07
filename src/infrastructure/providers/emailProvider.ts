/**
 * Email provider boundary (browser side).
 *
 * The browser never holds credentials. Test sends go through the local send
 * server (`npm run server`), which the app reaches via the `/api` proxy. When
 * that server is not running or not enabled, the provider reports
 * `connected: false` with a reason and the UI keeps sending disabled.
 *
 * Responses from the server are an untrusted boundary: they are parsed with
 * Zod before use.
 */
import { z } from 'zod'

export interface OutgoingTestEmail {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly templateId: string
}

export type ProviderStatus =
  | { readonly connected: false; readonly reason: string }
  | {
      readonly connected: true
      readonly provider: string
      readonly mode: 'live' | 'dry-run'
      readonly from: string
      readonly allowedRecipients: readonly string[]
      readonly region: string
    }

export type SendOutcome =
  | {
      readonly status: 'sent'
      readonly mode: 'live' | 'dry-run'
      readonly messageId: string
      readonly to: string
      readonly from: string
      readonly subject: string
      readonly sentAt: string
    }
  | { readonly status: 'not-sent'; readonly code: string; readonly message: string }

export interface EmailProvider {
  /** Stable identifier, e.g. "send-server". */
  readonly id: string
  /** Human readable label shown in the UI. */
  readonly label: string
  getStatus(): Promise<ProviderStatus>
  send(email: OutgoingTestEmail): Promise<SendOutcome>
}

export const SENDING_DISABLED_REASON =
  'Sending is disabled. Start the local send server with `npm run server` and enable it in .env to send test emails.'

/** Never sends. Used in tests and as a safe fallback. */
export class NoSendEmailProvider implements EmailProvider {
  readonly id = 'no-send'
  readonly label = 'No-send (local)'

  async getStatus(): Promise<ProviderStatus> {
    return { connected: false, reason: SENDING_DISABLED_REASON }
  }

  async send(): Promise<SendOutcome> {
    return { status: 'not-sent', code: 'sending-disabled', message: SENDING_DISABLED_REASON }
  }
}

const statusSchema = z.union([
  z.object({ enabled: z.literal(false), reason: z.string() }),
  z.object({
    enabled: z.literal(true),
    provider: z.string(),
    mode: z.enum(['live', 'dry-run']),
    from: z.string(),
    allowedRecipients: z.array(z.string()),
    region: z.string(),
  }),
])

const sendResponseSchema = z.union([
  z.object({
    status: z.literal('sent'),
    mode: z.enum(['live', 'dry-run']),
    messageId: z.string(),
    to: z.string(),
    from: z.string(),
    subject: z.string(),
    sentAt: z.string(),
  }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
])

export const SERVER_NOT_RUNNING_REASON =
  'Send server not reachable. Start it in another terminal with `npm run server`.'

/** Talks to the local send server through the Vite `/api` proxy. */
export class HttpTestEmailProvider implements EmailProvider {
  readonly id = 'send-server'
  readonly label = 'Amazon SES via local send server'
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(baseUrl = '/api/send-test', fetchImpl: typeof fetch = (...args) => fetch(...args)) {
    this.baseUrl = baseUrl
    this.fetchImpl = fetchImpl
  }

  async getStatus(): Promise<ProviderStatus> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}/status`, { headers: { accept: 'application/json' } })
    } catch {
      return { connected: false, reason: SERVER_NOT_RUNNING_REASON }
    }
    if (!response.ok) return { connected: false, reason: SERVER_NOT_RUNNING_REASON }

    const parsed = statusSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success)
      return { connected: false, reason: 'The send server returned an unexpected status response.' }
    if (!parsed.data.enabled) return { connected: false, reason: parsed.data.reason }
    const { provider, mode, from, allowedRecipients, region } = parsed.data
    return { connected: true, provider, mode, from, allowedRecipients, region }
  }

  async send(email: OutgoingTestEmail): Promise<SendOutcome> {
    let response: Response
    try {
      response = await this.fetchImpl(this.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(email),
      })
    } catch {
      return { status: 'not-sent', code: 'server-unreachable', message: SERVER_NOT_RUNNING_REASON }
    }
    const parsed = sendResponseSchema.safeParse(await response.json().catch(() => null))
    if (!parsed.success) {
      return {
        status: 'not-sent',
        code: 'unexpected-response',
        message: `The send server answered with HTTP ${response.status}.`,
      }
    }
    if (parsed.data.status === 'error') {
      return { status: 'not-sent', code: parsed.data.code, message: parsed.data.message }
    }
    const { mode, messageId, to, from, subject, sentAt } = parsed.data
    return { status: 'sent', mode, messageId, to, from, subject, sentAt }
  }
}

export const emailProvider: EmailProvider = new HttpTestEmailProvider()
