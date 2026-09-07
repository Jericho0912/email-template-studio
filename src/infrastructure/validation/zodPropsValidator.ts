/**
 * Adapter: turns a Zod schema into the domain's `PropsValidator`.
 * Zod stays in the infrastructure layer so the domain remains dependency-free.
 */
import type { z } from 'zod'
import type { PreviewPayload, PropsValidator, ValidationIssue } from '@/domain'

export function zodPropsValidator(schema: z.ZodType): PropsValidator {
  return (value: unknown) => {
    const result = schema.safeParse(value)
    if (result.success) {
      return { ok: true, value: result.data as PreviewPayload }
    }
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
      message: issue.message,
    }))
    return { ok: false, kind: 'schema', issues }
  }
}
