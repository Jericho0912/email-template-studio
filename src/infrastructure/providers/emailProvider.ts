/**
 * Email provider boundary.
 *
 * The MVP ships ONLY the no-send provider. It exists so that the UI and the
 * application layer already talk to a stable interface; a real provider
 * (for example Amazon SES) is a separate, later milestone (docs/ROADMAP.md).
 *
 * Hard rule for this repository: no provider may send email, hold
 * credentials, or call a network API until that milestone is explicitly
 * started.
 */
export interface OutgoingEmail {
  readonly to: string
  readonly from: string
  readonly subject: string
  readonly html: string
}

export type SendOutcome =
  | { readonly status: 'not-sent'; readonly reason: string }
  | { readonly status: 'sent'; readonly messageId: string }

export interface EmailProvider {
  /** Stable identifier shown in the UI, e.g. "no-send". */
  readonly id: string
  /** Human readable label shown in the UI. */
  readonly label: string
  /** True only for providers that can deliver real email. */
  readonly canSend: false | true
  send(email: OutgoingEmail): Promise<SendOutcome>
}

export const SENDING_DISABLED_REASON =
  'Sending is disabled in this milestone. Test email delivery will be added once a provider is connected.'

/** The only provider available in the MVP. It never sends anything. */
export class NoSendEmailProvider implements EmailProvider {
  readonly id = 'no-send'
  readonly label = 'No-send (local)'
  readonly canSend = false as const

  async send(): Promise<SendOutcome> {
    return { status: 'not-sent', reason: SENDING_DISABLED_REASON }
  }
}

export const emailProvider: EmailProvider = new NoSendEmailProvider()
