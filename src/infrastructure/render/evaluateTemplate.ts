/**
 * Step 2 of the preview pipeline: run the compiled module to get the component.
 *
 * The compiled code is CommonJS, so it expects `require`, `module` and
 * `exports`. We supply our own `require` that only knows the allow-listed
 * modules. This is the hard boundary for imports: the code cannot reach
 * anything we did not put in the map.
 */
import type { PreviewPayload, RenderError } from '@/domain'

export interface ModuleMap {
  readonly [specifier: string]: unknown
}

/** A template component. It returns a React element, typed as `unknown` to keep React out of the domain. */
export type TemplateComponent = (props: PreviewPayload) => unknown

export type EvaluateResult =
  | { readonly ok: true; readonly component: TemplateComponent }
  | { readonly ok: false; readonly error: RenderError }

export function evaluateTemplate(code: string, modules: ModuleMap): EvaluateResult {
  const require = (specifier: string): unknown => {
    if (!Object.hasOwn(modules, specifier)) {
      throw new Error(`Import "${specifier}" is not available in the studio.`)
    }
    return modules[specifier]
  }
  const module = { exports: {} as Record<string, unknown> }

  try {
    // `new Function` evaluates the code in the global scope of the current
    // realm (the render worker). It is NOT a sandbox by itself; isolation
    // comes from running inside a worker with hardened globals and a timeout.
    const run = new Function('require', 'module', 'exports', code) as (
      require: (specifier: string) => unknown,
      module: { exports: Record<string, unknown> },
      exports: Record<string, unknown>,
    ) => void
    run(require, module, module.exports)
  } catch (error) {
    return { ok: false, error: toEvaluateError(error) }
  }

  const candidate = module.exports.default
  if (typeof candidate !== 'function') {
    return {
      ok: false,
      error: {
        kind: 'evaluate',
        message: 'The template must `export default` a React component function.',
      },
    }
  }
  return { ok: true, component: candidate as TemplateComponent }
}

function toEvaluateError(error: unknown): RenderError {
  if (error instanceof Error) {
    return { kind: 'evaluate', message: error.message, detail: error.stack }
  }
  return { kind: 'evaluate', message: String(error) }
}
