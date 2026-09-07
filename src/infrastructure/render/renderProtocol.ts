/**
 * Messages exchanged between the main thread and the render worker.
 * Keeping them in one file documents the contract in a single place.
 */
import type { PreviewPayload, RenderResult } from '@/domain'

export interface RenderRequestMessage {
  readonly type: 'render'
  readonly id: number
  readonly source: string
  readonly props: PreviewPayload
}

export interface RenderResponseMessage {
  readonly type: 'result'
  readonly id: number
  readonly result: RenderResult
}
