import { useEffect, useState } from 'react'
import { Lock, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmailTemplate } from '@/domain'
import type { EmailProvider, ProviderStatus, SendOutcome } from '@/infrastructure/providers/emailProvider'
import { StatusBadge } from '@/presentation/shared/StatusBadge'

export interface SendTestEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate
  provider: EmailProvider
  /** HTML of the last successful render; null means nothing can be sent yet. */
  html: string | null
}

/**
 * Sends one test email through the provider. The action is only enabled when
 * the provider reports it is connected AND there is rendered HTML to send.
 * Every send goes to an allow-listed recipient chosen from the server's list.
 *
 * The form lives in its own component so that Radix unmounting the content on
 * close resets all state; every open starts with a fresh status check.
 */
export function SendTestEmailDialog({
  open,
  onOpenChange,
  template,
  provider,
  html,
}: SendTestEmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send test email</DialogTitle>
          <DialogDescription>
            Sends the current preview to one allow-listed address through the local send server. The browser
            never holds credentials.
          </DialogDescription>
        </DialogHeader>
        <SendTestEmailForm template={template} provider={provider} html={html} />
      </DialogContent>
    </Dialog>
  )
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; status: ProviderStatus }
  | { kind: 'sending'; status: ProviderStatus }

function SendTestEmailForm({
  template,
  provider,
  html,
}: Pick<SendTestEmailDialogProps, 'template' | 'provider' | 'html'>) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [recipient, setRecipient] = useState('')
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)

  useEffect(() => {
    let cancelled = false
    void provider.getStatus().then((status) => {
      if (cancelled) return
      setPhase({ kind: 'ready', status })
      if (status.connected) setRecipient(status.allowedRecipients[0] ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [provider])

  const status = phase.kind === 'loading' ? null : phase.status
  const connected = status?.connected === true
  const subject = template.metadata.subject
  const canSend = connected && html !== null && recipient !== '' && phase.kind === 'ready'
  const htmlKilobytes = html === null ? null : (new TextEncoder().encode(html).length / 1024).toFixed(1)

  async function send() {
    if (!canSend || !status?.connected || html === null) return
    setPhase({ kind: 'sending', status })
    const result = await provider.send({ to: recipient, subject, html, templateId: template.metadata.id })
    setOutcome(result)
    setPhase({ kind: 'ready', status })
    if (result.status === 'sent') {
      toast.success(
        result.mode === 'dry-run'
          ? `Dry run complete (${result.messageId}). Nothing was sent.`
          : `Test email sent to ${result.to}.`,
      )
    }
  }

  return (
    <>
      {phase.kind === 'loading' ? (
        <p className="text-muted-foreground text-xs" role="status">
          Checking the send server…
        </p>
      ) : status && !status.connected ? (
        <Alert>
          <Lock aria-hidden="true" />
          <AlertTitle>Sending is unavailable</AlertTitle>
          <AlertDescription>{status.reason}</AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
        <dt className="meta-label">
          <label htmlFor="send-test-recipient">To</label>
        </dt>
        <dd>
          {status?.connected ? (
            <Select value={recipient} onValueChange={setRecipient} disabled={phase.kind === 'sending'}>
              <SelectTrigger id="send-test-recipient" size="sm" className="w-full font-mono text-xs">
                <SelectValue placeholder="Choose a recipient" />
              </SelectTrigger>
              <SelectContent>
                {status.allowedRecipients.map((address) => (
                  <SelectItem key={address} value={address} className="font-mono text-xs">
                    {address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground font-mono">{template.metadata.to.address}</span>
          )}
        </dd>
        <dt className="meta-label">From</dt>
        <dd className="font-mono">{status?.connected ? status.from : template.metadata.from.address}</dd>
        <dt className="meta-label">Subject</dt>
        <dd>
          <span className="text-muted-foreground font-mono">[TEST]</span> {subject}
        </dd>
        <dt className="meta-label">Body</dt>
        <dd className={html === null ? 'text-danger-foreground' : ''}>
          {html === null
            ? 'No rendered HTML yet. Fix the template or payload first.'
            : `Current preview, ${htmlKilobytes} KB of HTML`}
        </dd>
        <dt className="meta-label">Provider</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {provider.label}
          {status?.connected ? (
            <>
              <StatusBadge tone="success">Connected</StatusBadge>
              {status.mode === 'dry-run' ? (
                <StatusBadge tone="warning">Dry run</StatusBadge>
              ) : (
                <StatusBadge tone="info">Live</StatusBadge>
              )}
              <span className="text-muted-foreground font-mono">{status.region}</span>
            </>
          ) : (
            <StatusBadge tone="neutral">Not connected</StatusBadge>
          )}
        </dd>
      </dl>

      {outcome ? (
        outcome.status === 'sent' ? (
          <Alert role="status">
            <Send aria-hidden="true" />
            <AlertTitle>{outcome.mode === 'dry-run' ? 'Dry run complete' : 'Test email sent'}</AlertTitle>
            <AlertDescription>
              Message id <span className="font-mono">{outcome.messageId}</span> · to{' '}
              <span className="font-mono">{outcome.to}</span>
              {outcome.mode === 'dry-run' ? '. Nothing left the server.' : '.'}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Not sent</AlertTitle>
            <AlertDescription>{outcome.message}</AlertDescription>
          </Alert>
        )
      ) : null}

      <DialogFooter className="items-center">
        <span className="text-muted-foreground mr-auto text-[11px]">
          {connected
            ? 'Allow-listed recipients only, rate limited by the server.'
            : 'See docs/SENDING.md to enable.'}
        </span>
        <DialogClose asChild>
          <Button variant="outline" size="sm">
            Close
          </Button>
        </DialogClose>
        <Button size="sm" disabled={!canSend} aria-disabled={!canSend} onClick={() => void send()}>
          {phase.kind === 'sending' ? 'Sending…' : 'Send test'}
          {!connected && phase.kind !== 'loading' ? (
            <StatusBadge tone="neutral" dot={false} className="ml-1 h-4">
              Unavailable
            </StatusBadge>
          ) : null}
        </Button>
      </DialogFooter>
    </>
  )
}
