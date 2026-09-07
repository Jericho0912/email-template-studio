import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { zodPropsValidator } from '@/infrastructure/validation/zodPropsValidator'
import { locate, parsePreviewPayload } from './parsePreviewPayload'

const validate = zodPropsValidator(
  z.strictObject({
    name: z.string().min(1),
    count: z.number().int(),
    nested: z.object({ flag: z.boolean() }).optional(),
  }),
)

describe('parsePreviewPayload', () => {
  it('accepts a valid object', () => {
    const result = parsePreviewPayload('{"name":"Ada","count":2}', validate)
    expect(result).toEqual({ ok: true, value: { name: 'Ada', count: 2 } })
  })

  it('reports invalid JSON, with a position when the engine provides one', () => {
    // V8 includes "(line L column C)" for structural errors such as a trailing comma.
    const positioned = parsePreviewPayload('{\n  "name": "Ada",\n  "count": 1,\n}', validate)
    expect(positioned.ok).toBe(false)
    if (positioned.ok) return
    expect(positioned.kind).toBe('invalid-json')
    expect(positioned.issues[0]?.path).toBe('(document)')
    expect(positioned.issues[0]?.message).toMatch(/^Invalid JSON/)
    expect(positioned.issues[0]?.line).toBe(4)

    // For "Unexpected token" errors V8 gives no position; we still report a clear message.
    const unpositioned = parsePreviewPayload('{"a": tru}', validate)
    expect(unpositioned).toMatchObject({ ok: false, kind: 'invalid-json' })
    if (unpositioned.ok) return
    expect(unpositioned.issues[0]?.message).toMatch(/^Invalid JSON/)
  })

  it('rejects JSON that is not an object', () => {
    expect(parsePreviewPayload('[1,2]', validate)).toMatchObject({ ok: false, kind: 'not-an-object' })
    expect(parsePreviewPayload('"text"', validate)).toMatchObject({ ok: false, kind: 'not-an-object' })
    expect(parsePreviewPayload('null', validate)).toMatchObject({ ok: false, kind: 'not-an-object' })
  })

  it('reports schema issues with the field path', () => {
    const result = parsePreviewPayload('{"name":"","count":"two","nested":{"flag":1},"extra":true}', validate)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.kind).toBe('schema')
    const paths = result.issues.map((issue) => issue.path)
    expect(paths).toContain('name')
    expect(paths).toContain('count')
    expect(paths).toContain('nested.flag')
    expect(paths.some((p) => p === '(root)' || p === 'extra')).toBe(true)
  })
})

describe('locate', () => {
  it('converts offsets to 1-based line and column', () => {
    expect(locate('ab\ncd', 0)).toEqual({ line: 1, column: 1 })
    expect(locate('ab\ncd', 3)).toEqual({ line: 2, column: 1 })
    expect(locate('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
    expect(locate('ab', 99)).toEqual({ line: 1, column: 3 })
  })
})
