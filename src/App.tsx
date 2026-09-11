import { useEffect, useMemo } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { emailProvider } from '@/infrastructure/providers/emailProvider'
import { WorkerTemplateRenderer } from '@/infrastructure/render/renderClient'
import { createSessionStore, getBrowserSessionStorage } from '@/infrastructure/session/sessionStore'
import { TEMPLATES } from '@/infrastructure/templates/registry'
import { PasswordGate } from '@/presentation/auth/PasswordGate'
import { StudioPage } from '@/presentation/studio/StudioPage'

/** Composition root: builds the infrastructure once and hands it to the page. */
export default function App() {
  const renderer = useMemo(() => new WorkerTemplateRenderer(), [])
  const store = useMemo(() => createSessionStore(getBrowserSessionStorage()), [])

  useEffect(() => () => renderer.dispose(), [renderer])

  return (
    <TooltipProvider delayDuration={300}>
      <PasswordGate>
        <StudioPage
          templates={TEMPLATES}
          renderer={renderer}
          store={store}
          provider={emailProvider}
          workspace="meridian-platform"
          environment="Local"
          version={__APP_VERSION__}
        />
      </PasswordGate>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
