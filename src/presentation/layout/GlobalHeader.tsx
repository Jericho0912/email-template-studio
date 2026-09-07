import { Building2, ChevronsUpDown, ExternalLink, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, StatusDot, type StatusTone } from '@/presentation/shared/StatusBadge'
import { cn } from '@/lib/utils'

export type WorkerHealth = 'ready' | 'busy' | 'error'

export interface GlobalHeaderProps {
  workspace: string
  environment: string
  workerHealth: WorkerHealth
  lastRenderMs: number | null
}

const NAV_ITEMS = ['Overview', 'Templates', 'Activity', 'Settings'] as const
const ACTIVE_NAV: (typeof NAV_ITEMS)[number] = 'Templates'

const healthTone: Record<WorkerHealth, StatusTone> = { ready: 'success', busy: 'info', error: 'danger' }
const healthLabel: Record<WorkerHealth, string> = {
  ready: 'Preview worker ready',
  busy: 'Rendering',
  error: 'Preview worker error',
}

export function GlobalHeader({ workspace, environment, workerHealth, lastRenderMs }: GlobalHeaderProps) {
  return (
    <header className="bg-card border-b">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-3 px-6">
        <a
          href="/"
          className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-3"
        >
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Mail className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Email Template Studio</span>
        </a>

        <span className="text-border text-lg select-none" aria-hidden="true">
          /
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 font-mono text-xs"
              aria-label={`Workspace: ${workspace}`}
            >
              <Building2 className="text-muted-foreground" aria-hidden="true" />
              {workspace}
              <ChevronsUpDown className="text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="meta-label">Workspace</DropdownMenuLabel>
            <DropdownMenuItem className="font-mono text-xs">{workspace}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-xs">
              Switch workspace · planned
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <StatusBadge tone="neutral">{environment}</StatusBadge>

        <nav aria-label="Product" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item === ACTIVE_NAV
            return (
              <a
                key={item}
                href="#"
                aria-current={active ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (!active) toast.info(`${item} is planned for a later milestone.`)
                }}
                className={cn(
                  'focus-visible:ring-ring/50 rounded-md px-2.5 py-1 text-sm transition-colors outline-none focus-visible:ring-3',
                  active
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item}
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div
            className="text-muted-foreground flex items-center gap-2 text-xs"
            role="status"
            aria-live="polite"
          >
            <StatusDot tone={healthTone[workerHealth]} />
            <span>{healthLabel[workerHealth]}</span>
            {lastRenderMs !== null ? <span className="font-mono tabular-nums">{lastRenderMs} ms</span> : null}
          </div>
          <Button asChild variant="ghost" size="sm">
            <a href="https://react.email/docs" target="_blank" rel="noreferrer">
              Docs
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
