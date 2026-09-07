import { Lock } from 'lucide-react'
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
import type { EmailTemplate } from '@/domain'
import type { EmailProvider } from '@/infrastructure/providers/emailProvider'
import { SENDING_DISABLED_REASON } from '@/infrastructure/providers/emailProvider'
import { StatusBadge } from '@/presentation/shared/StatusBadge'

export interface SendTestEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate
  provider: EmailProvider
}

/**
 * Explains why test sending is unavailable. The send action is driven by the
 * provider's `canSend` flag, so wiring a real provider later enables it
 * without touching this component.
 */
export function SendTestEmailDialog({ open, onOpenChange, template, provider }: SendTestEmailDialogProps) {
  const { from, to, subject } = template.metadata
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send test email</DialogTitle>
          <DialogDescription>
            Preview of what a test send would contain. Nothing is sent in this milestone.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Lock aria-hidden="true" />
          <AlertTitle>Sending is disabled</AlertTitle>
          <AlertDescription>{SENDING_DISABLED_REASON}</AlertDescription>
        </Alert>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="meta-label self-center">To</dt>
          <dd className="font-mono">{to.address}</dd>
          <dt className="meta-label self-center">From</dt>
          <dd className="font-mono">{from.address}</dd>
          <dt className="meta-label self-center">Subject</dt>
          <dd>{subject}</dd>
          <dt className="meta-label self-center">Provider</dt>
          <dd className="flex items-center gap-2">
            {provider.label}
            <StatusBadge tone={provider.canSend ? 'success' : 'neutral'}>
              {provider.canSend ? 'Connected' : 'Not connected'}
            </StatusBadge>
          </dd>
        </dl>

        <DialogFooter className="items-center">
          <span className="text-muted-foreground mr-auto text-[11px]">
            Planned: milestone 2 · provider integration
          </span>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>
          <Button size="sm" disabled={!provider.canSend} aria-disabled={!provider.canSend}>
            Send test
            <StatusBadge tone="neutral" dot={false} className="ml-1 h-4">
              Unavailable
            </StatusBadge>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
