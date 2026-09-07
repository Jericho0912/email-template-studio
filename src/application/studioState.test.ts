import { describe, expect, it } from 'vitest'
import { templateId, type EmailTemplate } from '@/domain'
import {
  createInitialState,
  getDraft,
  isPayloadDirty,
  isSourceDirty,
  isTemplateDirty,
  studioReducer,
  type StudioState,
} from './studioState'

const template: EmailTemplate = {
  metadata: {
    id: templateId('t1'),
    name: 'T1',
    slug: 't1',
    fileName: 't1.email.tsx',
    description: '',
    category: 'onboarding',
    status: 'ready',
    version: { number: 1, label: 'v1', createdAt: '2026-01-01T00:00:00Z' },
    fileType: 'tsx',
    subject: 'Subject',
    from: { name: 'A', address: 'a@example.com' },
    to: { name: 'B', address: 'b@example.com' },
    updatedAt: '2026-01-01T00:00:00Z',
  },
  source: 'ORIGINAL SOURCE',
  samplePayloadText: '{"a":1}',
  validateProps: () => ({ ok: true, value: {} }),
}
const id = template.metadata.id

function edited(): StudioState {
  let state = createInitialState(id)
  state = studioReducer(state, { type: 'edit-source', id, template, source: 'CHANGED' })
  state = studioReducer(state, { type: 'edit-payload', id, template, payloadText: '{"a":2}' })
  return state
}

describe('studioReducer', () => {
  it('starts clean with the originals', () => {
    const state = createInitialState(id)
    expect(getDraft(state, template)).toEqual({ source: 'ORIGINAL SOURCE', payloadText: '{"a":1}' })
    expect(isTemplateDirty(state, template)).toBe(false)
  })

  it('tracks edits and dirty flags independently', () => {
    const state = edited()
    expect(getDraft(state, template)).toEqual({ source: 'CHANGED', payloadText: '{"a":2}' })
    expect(isSourceDirty(state, template)).toBe(true)
    expect(isPayloadDirty(state, template)).toBe(true)
  })

  it('becomes clean again when an edit is typed back to the original', () => {
    let state = edited()
    state = studioReducer(state, { type: 'edit-source', id, template, source: 'ORIGINAL SOURCE' })
    expect(isSourceDirty(state, template)).toBe(false)
    expect(isPayloadDirty(state, template)).toBe(true)
    state = studioReducer(state, { type: 'edit-payload', id, template, payloadText: '{"a":1}' })
    expect(state.drafts).toEqual({})
  })

  it('resets source and payload separately', () => {
    let state = edited()
    state = studioReducer(state, { type: 'reset-source', id })
    expect(getDraft(state, template).source).toBe('ORIGINAL SOURCE')
    expect(getDraft(state, template).payloadText).toBe('{"a":2}')
    state = studioReducer(state, { type: 'reset-payload', id })
    expect(getDraft(state, template)).toEqual({ source: 'ORIGINAL SOURCE', payloadText: '{"a":1}' })
  })

  it('reset-template drops the draft entirely', () => {
    const state = studioReducer(edited(), { type: 'reset-template', id })
    expect(state.drafts).toEqual({})
    expect(isTemplateDirty(state, template)).toBe(false)
  })

  it('keeps drafts when switching templates', () => {
    let state = edited()
    state = studioReducer(state, { type: 'select-template', id: templateId('t2') })
    expect(state.selectedId).toBe('t2')
    expect(getDraft(state, template).source).toBe('CHANGED')
  })

  it('records simulated publishes and device changes', () => {
    let state = createInitialState(id)
    state = studioReducer(state, { type: 'set-device', device: 'mobile' })
    state = studioReducer(state, { type: 'simulate-publish', id, publishedAt: '2026-09-08T10:00:00Z' })
    expect(state.device).toBe('mobile')
    expect(state.localPublishes[id]).toBe('2026-09-08T10:00:00Z')
  })
})
