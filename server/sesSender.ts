/**
 * The one place that talks to Amazon SES (Node only, via the AWS SDK).
 *
 * Credentials come from the SDK's default provider chain (AWS_PROFILE,
 * ~/.aws/credentials or AWS_* variables); this code never reads them.
 * The Cloudflare Worker does not import this file: the SDK needs Node APIs
 * and would bloat the bundle. Phase 1 of docs/PLAN.md replaces it with a
 * small `aws4fetch` client that works in both runtimes.
 */
import {
  GetAccountCommand,
  GetEmailIdentityCommand,
  SESv2Client,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2'
import type { EmailSender } from './emailSender.ts'

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
