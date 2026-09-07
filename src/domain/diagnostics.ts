/**
 * Domain model: diagnostics shown in the studio's diagnostics panel.
 *
 * Only `pass`, `warning`, `error`, `pending` and `idle` describe checks the
 * application really performs. The remaining states exist so that the UI can
 * be honest about checks that are NOT implemented yet.
 */
export type DiagnosticState =
  'pass' | 'warning' | 'error' | 'pending' | 'idle' | 'planned' | 'not-connected' | 'simulated'

export interface DiagnosticItem {
  readonly id: string
  readonly label: string
  readonly state: DiagnosticState
  /** Short supporting text shown under the label. */
  readonly detail: string
}

/** True for states that describe a real check with a real outcome. */
export function isRealCheck(state: DiagnosticState): boolean {
  return (
    state === 'pass' || state === 'warning' || state === 'error' || state === 'pending' || state === 'idle'
  )
}
