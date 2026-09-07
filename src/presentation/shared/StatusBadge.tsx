import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Visual tone. Only five colours exist on purpose: green, amber, red, blue and neutral. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'planned'

const toneClasses: Record<StatusTone, string> = {
  success: 'border-success/30 bg-success-muted text-success-foreground',
  warning: 'border-warning/40 bg-warning-muted text-warning-foreground',
  danger: 'border-danger/30 bg-danger-muted text-danger-foreground',
  info: 'border-info/30 bg-info-muted text-info-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
  planned: 'border-dashed border-border bg-transparent text-muted-foreground',
}

const dotClasses: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted-foreground/60',
  planned: 'border border-muted-foreground/60 bg-transparent',
}

export interface StatusBadgeProps extends ComponentProps<'span'> {
  tone: StatusTone
  /** Show the small leading dot. */
  dot?: boolean
}

export function StatusBadge({ tone, dot = true, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md border px-1.5 text-[11px] leading-none font-medium whitespace-nowrap transition-colors duration-200 motion-reduce:transition-none',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot ? <StatusDot tone={tone} /> : null}
      {children}
    </span>
  )
}

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', dotClasses[tone], className)} />
  )
}
