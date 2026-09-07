/**
 * Main-thread client for the render worker.
 *
 * Responsibilities:
 * - lazily create the worker
 * - give every request an id and resolve the matching promise
 * - enforce a timeout: terminate the worker and report a `timeout` error
 * - recover from crashes by recreating the worker on the next request
 */
import type { PreviewPayload, RenderResult } from '@/domain'
import type { RenderRequestMessage, RenderResponseMessage } from './renderProtocol'

export interface RenderOptions {
  /** How long a single render may take before the worker is killed. */
  readonly timeoutMs?: number
}

export const DEFAULT_RENDER_TIMEOUT_MS = 5000

interface PendingRequest {
  readonly resolve: (result: RenderResult) => void
  readonly timer: ReturnType<typeof setTimeout>
}

export interface TemplateRenderer {
  render(source: string, props: PreviewPayload, options?: RenderOptions): Promise<RenderResult>
  dispose(): void
}

export class WorkerTemplateRenderer implements TemplateRenderer {
  private worker: Worker | null = null
  private nextId = 1
  private readonly pending = new Map<number, PendingRequest>()
  private readonly createWorker: () => Worker

  /** `createWorker` is injectable so tests can supply a fake worker. */
  constructor(createWorker: () => Worker = createRenderWorker) {
    this.createWorker = createWorker
  }

  render(source: string, props: PreviewPayload, options: RenderOptions = {}): Promise<RenderResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS
    const worker = this.ensureWorker()
    const id = this.nextId++

    return new Promise<RenderResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        this.restart('The preview worker was restarted after a timeout.')
        resolve({
          ok: false,
          error: {
            kind: 'timeout',
            message: `Rendering was stopped after ${timeoutMs / 1000}s. Check the template for infinite loops or very large output.`,
          },
        })
      }, timeoutMs)

      this.pending.set(id, { resolve, timer })
      const request: RenderRequestMessage = { type: 'render', id, source, props }
      worker.postMessage(request)
    })
  }

  dispose(): void {
    this.restart('The preview renderer was disposed.')
  }

  private ensureWorker(): Worker {
    if (this.worker === null) {
      this.worker = this.createWorker()
      this.worker.addEventListener('message', this.handleMessage)
      this.worker.addEventListener('error', this.handleError)
    }
    return this.worker
  }

  private readonly handleMessage = (event: MessageEvent<RenderResponseMessage>): void => {
    if (event.data?.type !== 'result') return
    const entry = this.pending.get(event.data.id)
    if (!entry) return
    clearTimeout(entry.timer)
    this.pending.delete(event.data.id)
    entry.resolve(event.data.result)
  }

  private readonly handleError = (event: ErrorEvent): void => {
    this.restart(
      event.message ? `The preview worker crashed: ${event.message}` : 'The preview worker crashed.',
    )
  }

  /** Terminates the worker and fails every in-flight request with a `worker` error. */
  private restart(reason: string): void {
    this.worker?.removeEventListener('message', this.handleMessage)
    this.worker?.removeEventListener('error', this.handleError)
    this.worker?.terminate()
    this.worker = null
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer)
      entry.resolve({ ok: false, error: { kind: 'worker', message: reason } })
    }
    this.pending.clear()
  }
}

function createRenderWorker(): Worker {
  // Vite recognises this pattern and bundles the worker as its own chunk.
  return new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })
}
