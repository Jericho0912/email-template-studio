/**
 * Step 1 of the preview pipeline: turn TSX text into plain JavaScript.
 *
 * We use sucrase because it is small, fast and runs in a Web Worker. It does
 * NOT type-check; it only strips types and rewrites JSX/imports. Type errors
 * therefore surface at runtime (or via the editor's own hints), which is an
 * accepted MVP limitation (see docs/TECH_DEBT.md).
 */
import { transform } from 'sucrase'
import type { RenderError } from '@/domain'

/**
 * The only modules a template may import. Anything else is rejected before
 * compilation (clear message) AND at runtime by the `require` shim in
 * evaluateTemplate.ts (hard guarantee).
 */
export const ALLOWED_MODULES = ['react', 'react/jsx-runtime', '@react-email/components'] as const

export type AllowedModule = (typeof ALLOWED_MODULES)[number]

/**
 * Finds module specifiers in `import ... from 'x'`, `import 'x'`,
 * `export ... from 'x'`, `require('x')` and `import('x')`.
 * A regex is good enough for a friendly pre-check; it is not the security
 * boundary (the runtime `require` shim is).
 */
const MODULE_SPECIFIER_PATTERN =
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

export function findModuleSpecifiers(source: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(MODULE_SPECIFIER_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4]
    if (specifier) found.push(specifier)
  }
  return found
}

export function findForbiddenImports(source: string): string[] {
  const allowed = new Set<string>(ALLOWED_MODULES)
  return [...new Set(findModuleSpecifiers(source).filter((specifier) => !allowed.has(specifier)))]
}

export type CompileResult =
  { readonly ok: true; readonly code: string } | { readonly ok: false; readonly error: RenderError }

export function compileTemplate(source: string): CompileResult {
  const forbidden = findForbiddenImports(source)
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: {
        kind: 'forbidden-import',
        message: `Import "${forbidden[0]}" is not available in the studio. Templates may only import: ${ALLOWED_MODULES.join(', ')}.`,
        detail: forbidden.length > 1 ? `Also not allowed: ${forbidden.slice(1).join(', ')}` : undefined,
      },
    }
  }

  try {
    const { code } = transform(source, {
      // typescript: strip types; jsx: rewrite <Tags/>; imports: ESM -> CommonJS `require()`
      transforms: ['typescript', 'jsx', 'imports'],
      // Use React's automatic runtime so templates do not need `import React`.
      jsxRuntime: 'automatic',
      // production=true selects react/jsx-runtime instead of the dev runtime.
      production: true,
      filePath: 'template.tsx',
    })
    return { ok: true, code }
  } catch (error) {
    return { ok: false, error: toCompileError(error) }
  }
}

/** sucrase reports positions inside the message, e.g. "Unexpected token (12:5)". */
function toCompileError(error: unknown): RenderError {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const position = /\((\d+):(\d+)\)\s*$/.exec(rawMessage)
  const message = rawMessage.replace(/\s*\(\d+:\d+\)\s*$/, '')
  return {
    kind: 'compile',
    message: `Syntax error: ${message}`,
    line: position ? Number(position[1]) : undefined,
    column: position ? Number(position[2]) + 1 : undefined,
  }
}
