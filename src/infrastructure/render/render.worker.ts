/**
 * Render worker entry point.
 *
 * Runs off the main thread so a slow or looping template cannot freeze the
 * UI, and so the main thread can kill it (`worker.terminate()`) on timeout.
 * Vite bundles this file separately; see renderClient.ts for how it is created.
 */
import './prismWorkerGuard' // keep first: see the file for why
import { hardenWorkerGlobals } from './hardenWorkerGlobals'
import { renderTemplate } from './renderTemplate'
import type { RenderRequestMessage, RenderResponseMessage } from './renderProtocol'

hardenWorkerGlobals(self)

self.addEventListener('message', async (event: MessageEvent<RenderRequestMessage>) => {
  if (event.data?.type !== 'render') return
  const { id, source, props } = event.data
  const result = await renderTemplate(source, props)
  const response: RenderResponseMessage = { type: 'result', id, result }
  self.postMessage(response)
})
