/**
 * Browser-session persistence for studio drafts.
 *
 * Uses `sessionStorage`, so edits survive a page refresh but are discarded
 * when the tab closes. The stored shape is validated on load with Zod: data
 * from storage is an untrusted boundary (`unknown` in, typed value out).
 */
import { z } from 'zod'

export const SESSION_STORAGE_KEY = 'email-template-studio:v1'

const draftSchema = z.object({
  source: z.string(),
  payloadText: z.string(),
})

const persistedStateSchema = z.object({
  selectedId: z.string(),
  device: z.enum(['desktop', 'mobile']),
  drafts: z.record(z.string(), draftSchema),
  localPublishes: z.record(z.string(), z.string()).default({}),
})

export type PersistedStudioState = z.infer<typeof persistedStateSchema>

export interface StudioSessionStore {
  load(): PersistedStudioState | null
  save(state: PersistedStudioState): void
  clear(): void
}

/** Minimal subset of the Web Storage API we rely on; makes tests easy. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createSessionStore(storage: StorageLike | null): StudioSessionStore {
  return {
    load() {
      if (!storage) return null
      try {
        const raw = storage.getItem(SESSION_STORAGE_KEY)
        if (raw === null) return null
        const parsed = persistedStateSchema.safeParse(JSON.parse(raw))
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    },
    save(state) {
      if (!storage) return
      try {
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Storage can be full or blocked (private mode). Losing persistence is acceptable.
      }
    },
    clear() {
      storage?.removeItem(SESSION_STORAGE_KEY)
    },
  }
}

/** Safe accessor: returns null when sessionStorage is unavailable (SSR, tests, locked-down browsers). */
export function getBrowserSessionStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}
