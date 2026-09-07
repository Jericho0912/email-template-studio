import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { EmailTemplate } from '@/domain'
import { StatusBadge } from '@/presentation/shared/StatusBadge'

export interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: EmailTemplate
  canPublish: boolean
  onConfirm: () => void
}

/** "Publish" is a local simulation in the MVP: it records a timestamp in this browser session only. */
export function PublishDialog({ open, onOpenChange, template, canPublish, onConfirm }: PublishDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Publish changes
            <StatusBadge tone="planned">Simulated</StatusBadge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Publishing is not connected to any environment yet. Confirming records a local snapshot of{' '}
            <span className="font-mono">{template.metadata.fileName}</span> in this browser session. Nothing
            is deployed, versioned or shared with your team.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!canPublish ? (
          <p className="text-danger-foreground text-xs" role="alert">
            The template must compile and render before it can be published, even locally.
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!canPublish} onClick={onConfirm}>
            Record local snapshot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
