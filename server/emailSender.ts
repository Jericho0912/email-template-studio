/**
 * The one place that talks to Amazon SES.
 *
 * `EmailSender` is deliberately tiny so the HTTP layer can be tested with a
 * fake, and so a dry-run sender can exercise the whole path without AWS.
 */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

export interface TestEmail {
  readonly from: string
  readonly to: string
  readonly subject: string
  readonly html: string
}

export interface SendReceipt {
  readonly messageId: string
}

export interface EmailSender {
  readonly mode: 'live' | 'dry-run'
  send(email: TestEmail): Promise<SendReceipt>
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
  }
}

/** Logs instead of sending. Used for local rehearsal and end-to-end tests. */
export function createDryRunSender(log: (line: string) => void = console.log): EmailSender {
  let counter = 0
  return {
    mode: 'dry-run',
    async send(email) {
      counter += 1
      const messageId = `dry-run-${counter}`
      log(
        `[dry-run] would send "${email.subject}" from ${email.from} to ${email.to} (${email.html.length} chars html) -> ${messageId}`,
      )
      return { messageId }
    },
  }
}
