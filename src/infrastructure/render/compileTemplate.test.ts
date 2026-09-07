import { describe, expect, it } from 'vitest'
import {
  ALLOWED_MODULES,
  compileTemplate,
  findForbiddenImports,
  findModuleSpecifiers,
} from './compileTemplate'

describe('findModuleSpecifiers', () => {
  it('finds static imports, side-effect imports, re-exports, require and dynamic import', () => {
    const source = `
      import * as React from 'react'
      import { Html } from "@react-email/components"
      import './side-effect.css'
      export { x } from 'somewhere'
      const fs = require('node:fs')
      const lazy = import('lodash')
    `
    expect(findModuleSpecifiers(source)).toEqual([
      'react',
      '@react-email/components',
      './side-effect.css',
      'somewhere',
      'node:fs',
      'lodash',
    ])
  })
})

describe('findForbiddenImports', () => {
  it('returns nothing for allow-listed modules', () => {
    const source = ALLOWED_MODULES.map((m) => `import * as x from '${m}'`).join('\n')
    expect(findForbiddenImports(source)).toEqual([])
  })

  it('lists each forbidden module once', () => {
    const source = `import fs from 'node:fs'\nimport again from 'node:fs'\nimport { a } from './local'`
    expect(findForbiddenImports(source)).toEqual(['node:fs', './local'])
  })
})

describe('compileTemplate', () => {
  it('compiles TSX with the automatic JSX runtime into CommonJS', () => {
    const result = compileTemplate(
      `export default function T(props: { name: string }) { return <p>{props.name}</p> }`,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.code).toContain('require("react/jsx-runtime")')
    expect(result.code).toContain('exports.default')
    expect(result.code).not.toContain(': string')
  })

  it('rejects forbidden imports with a friendly message before compiling', () => {
    const result = compileTemplate(`import fs from 'node:fs'\nexport default () => null`)
    expect(result).toMatchObject({ ok: false, error: { kind: 'forbidden-import' } })
    if (result.ok) return
    expect(result.error.message).toContain('"node:fs"')
    expect(result.error.message).toContain('@react-email/components')
  })

  it('reports syntax errors with a 1-based line and column', () => {
    const result = compileTemplate(`export default function T() {\n  return <p>\n}`)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('compile')
    expect(result.error.line).toBeGreaterThanOrEqual(2)
    expect(result.error.column).toBeGreaterThanOrEqual(1)
  })
})
