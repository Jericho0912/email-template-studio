/**
 * Use case: summarise the studio's current health as a list of diagnostics.
 *
 * Pure function: given validation + render state it returns display items.
 * Anything the app does not actually check is labelled `planned`,
 * `not-connected` or `simulated` so the UI never over-claims.
 */
import type { DiagnosticItem, RenderResult, RenderStatus, ValidationResult } from '@/domain'

export interface DiagnosticsInput {
  readonly validation: ValidationResult
  readonly renderStatus: RenderStatus
  readonly renderResult: RenderResult | null
  readonly sourceDirty: boolean
  readonly payloadDirty: boolean
}

export function buildDiagnostics(input: DiagnosticsInput): DiagnosticItem[] {
  return [
    templateDiagnostic(input),
    payloadDiagnostic(input.validation),
    renderDiagnostic(input),
    htmlDiagnostic(input.renderResult),
    {
      id: 'links',
      label: 'Link check',
      state: 'planned',
      detail: 'Will verify that every href resolves. Not implemented yet.',
    },
    {
      id: 'spf-dkim-dmarc',
      label: 'SPF / DKIM / DMARC',
      state: 'not-connected',
      detail: 'Requires a sending domain. Not connected in this milestone.',
    },
    {
      id: 'spam-score',
      label: 'Spam score',
      state: 'planned',
      detail: 'Placeholder. No deliverability service is connected.',
    },
  ]
}

function templateDiagnostic(input: DiagnosticsInput): DiagnosticItem {
  const error = input.renderResult && !input.renderResult.ok ? input.renderResult.error : null
  if (error && (error.kind === 'compile' || error.kind === 'forbidden-import' || error.kind === 'evaluate')) {
    return { id: 'template', label: 'Template source', state: 'error', detail: error.message }
  }
  if (input.renderStatus === 'success') {
    return {
      id: 'template',
      label: 'Template source',
      state: 'pass',
      detail: input.sourceDirty
        ? 'Compiles. Contains unsaved local edits.'
        : 'Compiles. Matches the original file.',
    }
  }
  return {
    id: 'template',
    label: 'Template source',
    state: 'pending',
    detail: 'Waiting for the next successful render.',
  }
}

function payloadDiagnostic(validation: ValidationResult): DiagnosticItem {
  if (validation.ok) {
    return {
      id: 'payload',
      label: 'Preview payload',
      state: 'pass',
      detail: 'Valid JSON. Matches the template schema.',
    }
  }
  const first = validation.issues[0]
  const where = first?.path && first.path !== '(document)' && first.path !== '(root)' ? `${first.path}: ` : ''
  const detail = `${where}${first?.message ?? 'Invalid payload.'}`
  return {
    id: 'payload',
    label: 'Preview payload',
    state: 'error',
    detail: validation.kind === 'schema' ? `Schema invalid. ${detail}` : detail,
  }
}

function renderDiagnostic(input: DiagnosticsInput): DiagnosticItem {
  switch (input.renderStatus) {
    case 'idle':
      return { id: 'render', label: 'Render', state: 'idle', detail: 'Nothing rendered yet.' }
    case 'blocked':
      return { id: 'render', label: 'Render', state: 'warning', detail: 'Paused until the payload is valid.' }
    case 'rendering':
      return { id: 'render', label: 'Render', state: 'pending', detail: 'Rendering in the preview worker.' }
    case 'success': {
      const duration = input.renderResult?.ok ? `${input.renderResult.durationMs} ms` : ''
      return { id: 'render', label: 'Render', state: 'pass', detail: `Rendered in ${duration}.` }
    }
    case 'error': {
      const error = input.renderResult && !input.renderResult.ok ? input.renderResult.error : null
      return { id: 'render', label: 'Render', state: 'error', detail: error?.message ?? 'Rendering failed.' }
    }
  }
}

function htmlDiagnostic(result: RenderResult | null): DiagnosticItem {
  if (result?.ok) {
    const kilobytes = (new TextEncoder().encode(result.html).length / 1024).toFixed(1)
    const state = Number(kilobytes) > 100 ? 'warning' : 'pass'
    return {
      id: 'html',
      label: 'HTML output',
      state,
      detail:
        state === 'warning'
          ? `${kilobytes} KB. Gmail clips messages over ~102 KB.`
          : `${kilobytes} KB generated.`,
    }
  }
  return { id: 'html', label: 'HTML output', state: 'idle', detail: 'No HTML generated yet.' }
}
