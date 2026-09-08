/**
 * The one place that talks to Amazon SES.
 *
 * `EmailSender` is deliberately tiny so the HTTP layer can be tested with a
 * fake, and so a dry-run sender can exercise the whole path without AWS.
 */
import { randomBytes } from 'node:crypto'
import {
  GetAccountCommand,
  GetEmailIdentityCommand,
  SESv2Client,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2'

export interface TestEmail {
  readonly from: string
  readonly to: string
  readonly subject: string
  readonly html: string
}

export interface SendReceipt {
  readonly messageId: string
}

/** Read-only checks run before any send, so misconfiguration is explained up front. */
export interface SenderPreflight {
  readonly ok: boolean
  readonly message: string
  /** True while the SES account is in the sandbox (recipients must be verified). */
  readonly sandbox?: boolean
  /** Verification status of the from identity (address or its domain). */
  readonly identityVerified?: boolean
  readonly dailyQuota?: number
  readonly sentLast24Hours?: number
}

export interface EmailSender {
  readonly mode: 'live' | 'dry-run'
  send(email: TestEmail): Promise<SendReceipt>
  preflight(from: string): Promise<SenderPreflight>
}

export interface SesSenderOptions {
  readonly region: string
  readonly configurationSet?: string
}

/** Real sender. Credentials come from the AWS SDK's default provider chain. */
export function createSesSender(options: SesSenderOptions): EmailSender {
  const client = new SESv2Client({ region: options.region })
  return {
    mode: 'live',
    async send(email) {
      const response = await client.send(
        new SendEmailCommand({
          FromEmailAddress: email.from,
          Destination: { ToAddresses: [email.to] },
          ConfigurationSetName: options.configurationSet,
          Content: {
            Simple: {
              Subject: { Data: email.subject, Charset: 'UTF-8' },
              Body: { Html: { Data: email.html, Charset: 'UTF-8' } },
            },
          },
        }),
      )
      return { messageId: response.MessageId ?? 'unknown' }
    },
    async preflight(from) {
      try {
        const account = await client.send(new GetAccountCommand({}))
        const identityVerified = await isIdentityVerified(client, from)
        const sandbox = account.ProductionAccessEnabled !== true
        const parts = [
          identityVerified
            ? `Sender ${from} is verified in ${options.region}.`
            : `Sender ${from} is NOT verified in ${options.region}; SES will reject sends.`,
          sandbox
            ? 'Account is in the SES sandbox: recipients must be verified identities.'
            : 'Account has production access.',
        ]
        return {
          ok: identityVerified,
          message: parts.join(' '),
          sandbox,
          identityVerified,
          dailyQuota: account.SendQuota?.Max24HourSend,
          sentLast24Hours: account.SendQuota?.SentLast24Hours,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { ok: false, message: `Could not reach Amazon SES: ${message}` }
      }
    },
  }
}

/** Checks the address itself, then its domain (addresses on a verified domain are valid senders). */
async function isIdentityVerified(client: SESv2Client, from: string): Promise<boolean> {
  const domain = from.split('@')[1] ?? ''
  for (const identity of [from, domain]) {
    if (!identity) continue
    try {
      const result = await client.send(new GetEmailIdentityCommand({ EmailIdentity: identity }))
      if (result.VerifiedForSendingStatus === true) return true
    } catch (error) {
      // NotFoundException means "no such identity"; anything else should surface.
      if (!(error instanceof Error && error.name === 'NotFoundException')) throw error
    }
  }
  return false
}

/** Logs instead of sending. Used for local rehearsal and end-to-end tests. */
export function createDryRunSender(log: (line: string) => void = console.log): EmailSender {
  let counter = 0
  return {
    mode: 'dry-run',
    async send(email) {
      counter += 1
      // As long as a real SES message id (about 60 characters) and with no
      // line-break opportunity inside it, which is how Firefox and Safari
      // treat a real id (UAX #14 never breaks between a hyphen and a digit).
      // The UI must cope with that shape, so the rehearsal produces it too.
      const messageId = `dry-run-${counter}-${randomBytes(26).toString('hex')}`
      log(
        `[dry-run] would send "${email.subject}" from ${email.from} to ${email.to} (${email.html.length} chars html) -> ${messageId}`,
      )
      return { messageId }
    },
    async preflight() {
      return { ok: true, message: 'Dry run: no AWS calls are made.' }
    },
  }
}
