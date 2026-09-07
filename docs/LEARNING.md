# Learning guide

For a developer coming from Salesforce (Apex, LWC, Flows) into this codebase. Each concept points at the file that uses it, so you can read code and theory together.

| Concept                                                          | Closest Salesforce idea                                         | Where it is used                                                                       | Read                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| TypeScript union types with a discriminant (`ok: true \| false`) | Apex enums + wrapper classes, but checked by the compiler       | `src/domain/preview.ts` (`ValidationResult`, `RenderResult`)                           | TS handbook: Narrowing, Discriminated unions                |
| Branded ids                                                      | Salesforce `Id` type                                            | `src/domain/template.ts` (`TemplateId`)                                                | TS handbook: Type aliases                                   |
| `unknown` at boundaries + runtime validation                     | Deserialising JSON with `JSON.deserializeUntyped` then checking | `src/application/parsePreviewPayload.ts`, `src/infrastructure/session/sessionStore.ts` | Zod docs: `safeParse`, `z.strictObject`                     |
| Pure reducer for state                                           | A service class with static methods, no side effects            | `src/application/studioState.ts` (+ test)                                              | React docs: Extracting state logic into a reducer           |
| React hooks (`useReducer`, `useEffect`, `useMemo`)               | LWC `@wire`/lifecycle hooks, but functions                      | `src/presentation/hooks/useStudio.ts`, `useRenderPreview.ts`                           | React docs: Hooks reference, "You might not need an effect" |
| Derived state instead of stored state                            | Formula fields                                                  | `useRenderPreview.ts` derives `status` from keys                                       | React docs: Choosing the state structure                    |
| Web Workers and `postMessage`                                    | Queueable/async Apex running off the main thread                | `src/infrastructure/render/render.worker.ts`, `renderClient.ts`                        | MDN: Using Web Workers                                      |
| `new Function` and CommonJS `require`                            | Dynamic Apex (`Type.forName`) with an allow-list                | `src/infrastructure/render/evaluateTemplate.ts`                                        | MDN: Function constructor (and why it is dangerous)         |
| iframe `sandbox` and CSP                                         | Lightning Locker / LWS isolation                                | `src/infrastructure/render/previewDocument.ts`, `PreviewWorkspace.tsx`                 | MDN: iframe sandbox, Content-Security-Policy                |
| React Email components                                           | Visualforce email templates, but React                          | `src/infrastructure/templates/*.email.tsx`                                             | react.email docs: Components, `render`                      |
| Vite `?raw` imports                                              | Static resources                                                | `src/infrastructure/templates/registry.ts`                                             | Vite docs: Static asset handling                            |
| Tailwind v4 tokens (`@theme`)                                    | SLDS design tokens                                              | `src/index.css`                                                                        | Tailwind docs: Theme variables                              |
| shadcn/ui                                                        | Base Lightning components you copy and own                      | `src/components/ui/*`, `components.json`                                               | ui.shadcn.com/docs                                          |
| Accessible roles and names                                       | LWC accessibility guidance                                      | `aria-label`, `role="region"`, `aria-pressed` across `src/presentation`                | MDN: ARIA, WAI-ARIA Authoring Practices                     |
| Unit tests with Vitest                                           | Apex test classes                                               | `*.test.ts` next to each module                                                        | vitest.dev/guide                                            |
| Component tests with Testing Library                             | Jest tests for LWC                                              | `src/presentation/studio/*.test.tsx`                                                   | testing-library.com/docs                                    |
| Browser tests with Playwright                                    | UTAM / Selenium                                                 | `e2e/studio.spec.ts`, `playwright.config.ts`                                           | playwright.dev/docs                                         |

## Suggested reading order through the code

1. `src/domain/*` — the vocabulary (10 minutes).
2. `src/application/studioState.ts` and its test — how state changes without React.
3. `src/infrastructure/render/renderTemplate.ts` then `compileTemplate.ts` and `evaluateTemplate.ts` — the pipeline in plain functions.
4. `src/infrastructure/render/renderClient.ts` and `render.worker.ts` — the worker boundary.
5. `src/presentation/studio/StudioPage.tsx` — how everything is composed.
6. `e2e/studio.spec.ts` — the behaviours we promise, written as a user would experience them.

## Things worth practising

- Add a fourth template: create `*.email.tsx`, a Zod schema and a registry entry; run `npm test` (the render test picks it up automatically).
- Add a diagnostic: extend `buildDiagnostics.ts` and its test before touching the panel.
- Change the debounce or timeout constants and watch the E2E tests react.
