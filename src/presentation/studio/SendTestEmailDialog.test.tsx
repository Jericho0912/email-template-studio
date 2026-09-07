// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoSendEmailProvider } from '@/infrastructure/providers/emailProvider'
import { TEMPLATES } from '@/infrastructure/templates/registry'
import { SendTestEmailDialog } from './SendTestEmailDialog'

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
})
