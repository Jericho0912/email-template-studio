/** Maps domain diagnostic states to presentation tones and labels. */
import type { DiagnosticState } from '@/domain'
import type { StatusTone } from './StatusBadge'

export function toneForDiagnostic(state: DiagnosticState): StatusTone {
  switch (state) {
    case 'pass':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'danger'
    case 'pending':
      return 'info'
    case 'idle':
      return 'neutral'
    case 'planned':
    case 'not-connected':
    case 'simulated':
      return 'planned'
  }
}

export function labelForDiagnostic(state: DiagnosticState): string {
  switch (state) {
    case 'pass':
      return 'Pass'
    case 'warning':
      return 'Warning'
    case 'error':
      return 'Error'
    case 'pending':
      return 'Running'
    case 'idle':
      return 'Idle'
    case 'planned':
      return 'Planned'
    case 'not-connected':
      return 'Not connected'
    case 'simulated':
      return 'Simulated'
  }
}
