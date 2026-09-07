import { describe, expect, it } from 'vitest'
import { hardenWorkerGlobals } from './hardenWorkerGlobals'

describe('hardenWorkerGlobals', () => {
  it('replaces globals on the object and its prototype chain and makes them immutable', () => {
    const proto = { fetch: () => 'network', keep: () => 'ok' }
    const scope = Object.create(proto) as { fetch?: unknown; keep: () => string; XMLHttpRequest?: unknown }

    hardenWorkerGlobals(scope, ['fetch', 'XMLHttpRequest'])

    expect(scope.fetch).toBeUndefined()
    expect(proto.fetch).toBeUndefined()
    expect(scope.keep()).toBe('ok')
    // Cannot be restored by deleting the shadowing property or reassigning it.
    expect(() => {
      'use strict'
      delete scope.fetch
    }).toThrow()
    expect(Reflect.set(scope, 'fetch', () => 'restored')).toBe(false)
    expect(scope.fetch).toBeUndefined()
    // Names that never existed are defined as undefined too, so lookups cannot fall through.
    expect(Object.hasOwn(scope, 'XMLHttpRequest')).toBe(true)
  })
})
