import { useState } from 'react'
import { Braces, RotateCcw } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import type { ValidationResult } from '@/domain'
import { CodeEditor } from '@/presentation/shared/CodeEditor'
import { StatusBadge } from '@/presentation/shared/StatusBadge'
import { AnimatedBadge } from '@/components/motion/animated-badge'

export interface PayloadPanelProps {
  payloadText: string
  onChange: (text: string) => void
  validation: ValidationResult
  payloadDirty: boolean
  onReset: () => void
}

export function PayloadPanel({
  payloadText,
  onChange,
  validation,
  payloadDirty,
  onReset,
}: PayloadPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const canFormat = validation.ok || validation.kind === 'schema' || validation.kind === 'not-an-object'

  function format() {
    try {
      onChange(`${JSON.stringify(JSON.parse(payloadText), null, 2)}\n`)
    } catch {
      // Not valid JSON; the button is disabled in that case anyway.
    }
  }

  return (
    <section
      aria-labelledby="payload-heading"
      className="bg-card flex flex-col overflow-hidden rounded-lg border"
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <h2 id="payload-heading" className="text-xs font-medium">
          Preview payload
        </h2>
        <span className="text-muted-foreground font-mono text-[11px]">props.json</span>
        {/* beUI animated badge: the icon/label roll communicates the validation state change. */}
        <AnimatedBadge
          size="sm"
          status={validation.ok ? 'success' : 'danger'}
          contentKey={validation.ok ? 'valid' : validation.kind}
          role="status"
        >
          {validation.ok ? 'Schema valid' : validation.kind === 'schema' ? 'Schema invalid' : 'Invalid JSON'}
        </AnimatedBadge>
        {payloadDirty ? <StatusBadge tone="warning">Modified</StatusBadge> : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={format} disabled={!canFormat}>
            <Braces aria-hidden="true" />
            Format
          </Button>
          <Button variant="ghost" size="sm" disabled={!payloadDirty} onClick={() => setConfirmReset(true)}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>

      <CodeEditor
        value={payloadText}
        onChange={onChange}
        language="json"
        label="Preview payload JSON"
        className="h-[220px]"
      />

      <div className="border-t px-3 py-2 text-xs" aria-live="polite">
        {validation.ok ? (
          <p className="text-muted-foreground">
            {Object.keys(validation.value).length} props validated. The preview updates after a short pause.
          </p>
        ) : (
          <ul role="list" className="space-y-1">
            {validation.issues.map((issue, index) => (
              <li key={`${issue.path}-${index}`} className="text-danger-foreground flex gap-2">
                <span className="bg-danger-muted rounded px-1 font-mono">{issue.path}</span>
                <span className="min-w-0 break-words">
                  {issue.message}
                  {issue.line ? (
                    <span className="text-muted-foreground font-mono">
                      {' '}
                      (line {issue.line}
                      {issue.column ? `:${issue.column}` : ''})
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the preview payload?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the template's sample data and discards your edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset()
                setConfirmReset(false)
              }}
            >
              Reset payload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
