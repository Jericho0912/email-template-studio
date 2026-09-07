import { describe, expect, it } from 'vitest'
import { evaluateTemplate } from './evaluateTemplate'

describe('evaluateTemplate', () => {
  it('returns the default export when it is a function', () => {
    const result = evaluateTemplate(`exports.default = function T() { return 'ok' }`, {})
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.component({})).toBe('ok')
  })

  it('fails when there is no default export function', () => {
    const result = evaluateTemplate(`exports.something = 1`, {})
    expect(result).toMatchObject({ ok: false, error: { kind: 'evaluate' } })
    if (result.ok) return
    expect(result.error.message).toContain('export default')
  })

  it('only resolves modules from the provided map', () => {
    const modules = { react: { createElement: () => 'element' } }
    const good = evaluateTemplate(
      `const r = require('react'); exports.default = () => r.createElement()`,
      modules,
    )
    expect(good.ok).toBe(true)

    const bad = evaluateTemplate(`require('node:fs'); exports.default = () => null`, modules)
    expect(bad).toMatchObject({ ok: false, error: { kind: 'evaluate' } })
    if (bad.ok) return
    expect(bad.error.message).toContain('"node:fs"')
  })

  it('reports errors thrown while the module body runs', () => {
    const result = evaluateTemplate(`throw new Error('boom at load')`, {})
    expect(result).toMatchObject({ ok: false, error: { kind: 'evaluate', message: 'boom at load' } })
  })
})
