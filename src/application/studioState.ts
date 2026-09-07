/**
 * Studio state: which template is selected, per-template drafts, device mode.
 *
 * Implemented as a pure reducer so that every state transition is a plain
 * function we can unit test. React wiring lives in useStudio.ts.
 *
 * Drafts are stored PER TEMPLATE. Switching templates therefore never
 * discards edits; they are simply waiting under the other card.
 */
import type { EmailTemplate, PreviewDevice, TemplateId } from '@/domain'

export interface TemplateDraft {
  readonly source: string
  readonly payloadText: string
}

export interface StudioState {
  readonly selectedId: TemplateId
  /** Only templates that have been edited have an entry here. */
  readonly drafts: Readonly<Record<string, TemplateDraft>>
  readonly device: PreviewDevice
  /** Simulated "publish" timestamps (ISO) per template. Local to this browser session. */
  readonly localPublishes: Readonly<Record<string, string>>
}

export type StudioAction =
  | { readonly type: 'select-template'; readonly id: TemplateId }
  | {
      readonly type: 'edit-source'
      readonly id: TemplateId
      readonly source: string
      readonly template: EmailTemplate
    }
  | {
      readonly type: 'edit-payload'
      readonly id: TemplateId
      readonly payloadText: string
      readonly template: EmailTemplate
    }
  | { readonly type: 'reset-source'; readonly id: TemplateId }
  | { readonly type: 'reset-payload'; readonly id: TemplateId }
  | { readonly type: 'reset-template'; readonly id: TemplateId }
  | { readonly type: 'set-device'; readonly device: PreviewDevice }
  | { readonly type: 'simulate-publish'; readonly id: TemplateId; readonly publishedAt: string }

export function createInitialState(selectedId: TemplateId): StudioState {
  return { selectedId, drafts: {}, device: 'desktop', localPublishes: {} }
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'select-template':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id }

    case 'edit-source': {
      const current = getDraft(state, action.template)
      return withDraft(state, action.id, action.template, { ...current, source: action.source })
    }

    case 'edit-payload': {
      const current = getDraft(state, action.template)
      return withDraft(state, action.id, action.template, { ...current, payloadText: action.payloadText })
    }

    case 'reset-source': {
      const draft = state.drafts[action.id]
      if (!draft) return state
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...draft, source: '' } } }
    }

    case 'reset-payload': {
      const draft = state.drafts[action.id]
      if (!draft) return state
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...draft, payloadText: '' } } }
    }

    case 'reset-template':
      return removeDraft(state, action.id)

    case 'set-device':
      return state.device === action.device ? state : { ...state, device: action.device }

    case 'simulate-publish':
      return { ...state, localPublishes: { ...state.localPublishes, [action.id]: action.publishedAt } }
  }
}

/**
 * Stores a draft, or removes it when it equals the original so that the
 * "modified" indicator disappears as soon as the user undoes their change.
 *
 * Note: reset actions store an empty string as a marker; getDraft() maps an
 * empty string back to the original text. This keeps the reducer free of
 * template lookups.
 */
function withDraft(
  state: StudioState,
  id: TemplateId,
  template: EmailTemplate,
  draft: TemplateDraft,
): StudioState {
  const normalized: TemplateDraft = {
    source: draft.source === template.source ? '' : draft.source,
    payloadText: draft.payloadText === template.samplePayloadText ? '' : draft.payloadText,
  }
  if (normalized.source === '' && normalized.payloadText === '') return removeDraft(state, id)
  return { ...state, drafts: { ...state.drafts, [id]: normalized } }
}

function removeDraft(state: StudioState, id: TemplateId): StudioState {
  if (!(id in state.drafts)) return state
  const drafts = { ...state.drafts }
  delete drafts[id]
  return { ...state, drafts }
}

/** The text the editors should show: the draft if present, else the original. */
export function getDraft(state: StudioState, template: EmailTemplate): TemplateDraft {
  const draft = state.drafts[template.metadata.id]
  return {
    source: draft && draft.source !== '' ? draft.source : template.source,
    payloadText: draft && draft.payloadText !== '' ? draft.payloadText : template.samplePayloadText,
  }
}

export function isSourceDirty(state: StudioState, template: EmailTemplate): boolean {
  const draft = state.drafts[template.metadata.id]
  return Boolean(draft && draft.source !== '' && draft.source !== template.source)
}

export function isPayloadDirty(state: StudioState, template: EmailTemplate): boolean {
  const draft = state.drafts[template.metadata.id]
  return Boolean(draft && draft.payloadText !== '' && draft.payloadText !== template.samplePayloadText)
}

export function isTemplateDirty(state: StudioState, template: EmailTemplate): boolean {
  return isSourceDirty(state, template) || isPayloadDirty(state, template)
}
