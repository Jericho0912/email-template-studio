import { describe, expect, it } from 'vitest'
import { createSessionStore, SESSION_STORAGE_KEY, type StorageLike } from './sessionStore'

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('createSessionStore', () => {
  it('round-trips a valid state', () => {
    const storage = memoryStorage()
    const store = createSessionStore(storage)
    const state = {
      selectedId: 'a',
      device: 'mobile' as const,
      drafts: { a: { source: 's', payloadText: 'p' } },
      localPublishes: {},
    }
    store.save(state)
    expect(store.load()).toEqual(state)
  })

  it('ignores corrupt or unexpected data instead of throwing', () => {
    const storage = memoryStorage()
    const store = createSessionStore(storage)
    storage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(store.load()).toBeNull()
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ selectedId: 1, drafts: 'nope' }))
    expect(store.load()).toBeNull()
  })

  it('is a no-op without storage', () => {
    const store = createSessionStore(null)
    expect(store.load()).toBeNull()
    expect(() =>
      store.save({ selectedId: 'a', device: 'desktop', drafts: {}, localPublishes: {} }),
    ).not.toThrow()
  })
})
