// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  NoSendEmailProvider,
  type EmailProvider,
  type ProviderStatus,
  type SendOutcome,
} from '@/infrastructure/providers/emailProvider'
import { TEMPLATES } from '@/infrastructure/templates/registry'
import { SendTestEmailDialog } from './SendTestEmailDialog'

/** Connected provider whose send() succeeds with whatever message id it is given. */
class FakeConnectedProvider implements EmailProvider {
  readonly id = 'fake'
  readonly label = 'Fake provider'
  private readonly messageId: string
  constructor(messageId: string) {
    this.messageId = messageId
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      connected: true,
      provider: 'fake',
      mode: 'dry-run',
      from: 'studio@example.test',
      allowedRecipients: ['qa@example.test'],
      region: 'us-east-1',
    }
  }

  async send(): Promise<SendOutcome> {
    return {
      status: 'sent',
      mode: 'dry-run',
      messageId: this.messageId,
      to: 'qa@example.test',
      from: 'studio@example.test',
      subject: '[TEST] x',
      sentAt: new Date().toISOString(),
    }
  }
}

describe('SendTestEmailDialog', () => {
  it('keeps sending disabled and explains why when no provider is connected', async () => {
    render(
      <SendTestEmailDialog
        open
        onOpenChange={() => {}}
        template={TEMPLATES[0]}
        provider={new NoSendEmailProvider()}
        html="<p>x</p>"
      />,
    )
    expect(await screen.findByText('Sending is unavailable')).toBeInTheDocument()
    expect(screen.getByText(/Sending is disabled/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send test/ })).toBeDisabled()
    expect(screen.getByText('Not connected')).toBeInTheDocument()
  })

  it('wraps a long message id so it cannot widen the dialog', async () => {
    // jsdom does not lay out, so the check is on the class that makes the
    // unbreakable id wrap; the e2e test measures the real dialog width.
    const messageId = 'a'.repeat(70)
    expect(messageId).toHaveLength(70)
    render(
      <SendTestEmailDialog
        open
        onOpenChange={() => {}}
        template={TEMPLATES[0]}
        provider={new FakeConnectedProvider(messageId)}
        html="<p>x</p>"
      />,
    )
    const sendButton = await screen.findByRole('button', { name: /^Send test$/ })
    expect(sendButton).toBeEnabled()
    await userEvent.click(sendButton)

    expect(await screen.findByText('Dry run complete')).toBeInTheDocument()
    expect(screen.getByText(messageId)).toHaveClass('break-all')
  })
})
