/**
 * Use case: turn the payload editor's text into validated template props.
 *
 * Three failure modes are reported separately so the UI can explain them:
 * 1. invalid JSON (with line/column when the engine tells us)
 * 2. valid JSON that is not an object
 * 3. an object that fails the template's schema (field-level issues)
 */
import type { PropsValidator, ValidationIssue, ValidationResult } from '@/domain'

export function parsePreviewPayload(text: string, validate: PropsValidator): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { ok: false, kind: 'invalid-json', issues: [describeJsonError(error, text)] }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      kind: 'not-an-object',
      issues: [
        {
          path: '(root)',
          message: 'The payload must be a JSON object, for example { "recipientName": "Ada" }.',
        },
      ],
    }
  }

  return validate(parsed)
}

/**
 * JSON.parse error messages differ between engines. V8 includes
 * "at position N" (and, in newer versions, "(line L column C)").
 */
function describeJsonError(error: unknown, text: string): ValidationIssue {
  const raw = error instanceof Error ? error.message : String(error)
  const lineColumn = /line (\d+) column (\d+)/i.exec(raw)
  const position = /position (\d+)/i.exec(raw)

  let line: number | undefined
  let column: number | undefined
  if (lineColumn) {
    line = Number(lineColumn[1])
    column = Number(lineColumn[2])
  } else if (position) {
    const located = locate(text, Number(position[1]))
    line = located.line
    column = located.column
  }

  const message = raw.replace(/^JSON\.parse:\s*/i, '').replace(/^Unexpected token/, 'Unexpected character')
  return { path: '(document)', message: `Invalid JSON: ${message}`, line, column }
}

/** Converts a 0-based character offset into 1-based line/column. */
export function locate(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length))
  const before = text.slice(0, clamped)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}
