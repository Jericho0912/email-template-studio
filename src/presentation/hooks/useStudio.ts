/**
 * React wiring for the studio reducer + session persistence.
 * All state transitions live in application/studioState.ts; this hook only
 * connects them to React and to the browser session store.
 */
import { useEffect, useMemo, useReducer } from 'react'
import type { EmailTemplate, PreviewDevice, TemplateId } from '@/domain'
import {
  createInitialState,
  getDraft,
  isPayloadDirty,
  isSourceDirty,
  isTemplateDirty,
  studioReducer,
  type StudioState,
  type TemplateDraft,
} from '@/application/studioState'
import type { PersistedStudioState, StudioSessionStore } from '@/infrastructure/session/sessionStore'

export interface UseStudioOptions {
  readonly templates: readonly EmailTemplate[]
  readonly store: StudioSessionStore
  /** Injectable clock (ISO string) so tests are deterministic. */
  readonly now?: () => string
}

export interface StudioActions {
  selectTemplate(id: TemplateId): void
  updateSource(source: string): void
  updatePayload(payloadText: string): void
  resetSource(): void
  resetPayload(): void
  resetTemplate(): void
  setDevice(device: PreviewDevice): void
  simulatePublish(): void
}

export interface UseStudioResult {
  readonly state: StudioState
  readonly template: EmailTemplate
  readonly draft: TemplateDraft
  readonly sourceDirty: boolean
  readonly payloadDirty: boolean
  /** Ids of every template that currently has local edits. */
  readonly dirtyTemplateIds: ReadonlySet<TemplateId>
  readonly actions: StudioActions
}

export function useStudio({
  templates,
  store,
  now = () => new Date().toISOString(),
}: UseStudioOptions): UseStudioResult {
  const [state, dispatch] = useReducer(studioReducer, undefined, () => hydrate(store.load(), templates))

  useEffect(() => {
    store.save(state)
  }, [state, store])

  const template = useMemo(
    () => templates.find((candidate) => candidate.metadata.id === state.selectedId) ?? templates[0],
    [templates, state.selectedId],
  )
  const id = template.metadata.id

  const actions = useMemo<StudioActions>(
    () => ({
      selectTemplate: (next) => dispatch({ type: 'select-template', id: next }),
      updateSource: (source) => dispatch({ type: 'edit-source', id, template, source }),
      updatePayload: (payloadText) => dispatch({ type: 'edit-payload', id, template, payloadText }),
      resetSource: () => dispatch({ type: 'reset-source', id }),
      resetPayload: () => dispatch({ type: 'reset-payload', id }),
      resetTemplate: () => dispatch({ type: 'reset-template', id }),
      setDevice: (device) => dispatch({ type: 'set-device', device }),
      simulatePublish: () => dispatch({ type: 'simulate-publish', id, publishedAt: now() }),
    }),
    [id, template, now],
  )

  const dirtyTemplateIds = useMemo(
    () =>
      new Set(
        templates
          .filter((candidate) => isTemplateDirty(state, candidate))
          .map((candidate) => candidate.metadata.id),
      ),
    [templates, state],
  )

  return {
    state,
    template,
    draft: getDraft(state, template),
    sourceDirty: isSourceDirty(state, template),
    payloadDirty: isPayloadDirty(state, template),
    dirtyTemplateIds,
    actions,
  }
}

/** Rebuilds state from storage, dropping anything that refers to unknown templates. */
export function hydrate(
  persisted: PersistedStudioState | null,
  templates: readonly EmailTemplate[],
): StudioState {
  const fallback = createInitialState(templates[0].metadata.id)
  if (!persisted) return fallback
  const known = new Set<string>(templates.map((template) => template.metadata.id))
  const keepKnown = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([key]) => known.has(key)))
  return {
    selectedId: known.has(persisted.selectedId) ? (persisted.selectedId as TemplateId) : fallback.selectedId,
    drafts: keepKnown(persisted.drafts),
    localPublishes: keepKnown(persisted.localPublishes),
    device: persisted.device,
  }
}
