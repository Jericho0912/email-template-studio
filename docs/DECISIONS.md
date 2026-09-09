# Architecture decision records

Each record: context, decision, alternatives, consequences. Versions are those installed on 2026-09-08.

| #   | Topic           | Decision                                                                            | Rejected                                                                                     |
| --- | --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Framework       | Vite 8.2 + React 19.2 + TypeScript 6.0 single-page app                              | Next.js 16 (server not needed yet), Vite + Hono server                                       |
| 2   | Styling         | Tailwind CSS 4.3 via `@tailwindcss/vite`, tokens as CSS variables                   | CSS modules, styled-components                                                               |
| 3   | Components      | shadcn/ui 4.21 (radix base, "nova" preset, Lucide icons)                            | MUI, Chakra, hand-rolled                                                                     |
| 4   | Motion          | beUI via shadcn registry, one component (`animated-badge`), on `motion` 13.2        | Whole beUI kit; framer-motion legacy; no motion                                              |
| 5   | Code editor     | CodeMirror 6 via `@uiw/react-codemirror` 4.25                                       | Monaco (10× larger, worker plumbing)                                                         |
| 6   | TSX compiler    | sucrase 3.35 in a Web Worker                                                        | `@babel/standalone` (2.4 MB), esbuild-wasm (14 MB), TypeScript (7.x has no JS transpile API) |
| 7   | Render location | Browser, inside the worker, with `@react-email/components` 1.0                      | Server render (no server; riskier for arbitrary code)                                        |
| 8   | Isolation       | Worker + hardened globals + timeout + `iframe sandbox=""` + CSP                     | `eval` on main thread; cross-origin iframe host (later)                                      |
| 9   | Validation      | Zod 4.5 schemas per template, adapted to a domain `PropsValidator`                  | JSON Schema + ajv; hand-written checks                                                       |
| 10  | State           | `useReducer` + pure reducer + `sessionStorage`                                      | Zustand/Redux (over-scoped for one page)                                                     |
| 11  | Testing         | Vitest 5 (node + jsdom) + Testing Library + Playwright 1.63 on the production build | Jest; Cypress                                                                                |
| 12  | Lint / format   | oxlint (shipped by the Vite template) + Prettier 3.9 with Tailwind plugin           | ESLint flat config (heavier setup)                                                           |
| 13  | Package manager | npm 11 (only one installed)                                                         | pnpm, bun                                                                                    |
| 14  | Fonts           | Geist + Geist Mono (open licence, self-hosted via @fontsource)                      | Inter (closer to the reference product), system fonts                                        |

Decisions 15 onwards (Workers hosting, Vite plugin, aws4fetch, Cloudflare Access, D1, Rate Limiting binding, JSON Schema props contract, Worker Loaders) are proposed in `docs/PLAN.md` section 1 and get a numbered record here when the phase that uses them lands.

## ADR-1 Framework: Vite SPA

**Context.** Empty repository; internal tool; future Cloudflare deployment; beginner-friendly code required.
**Decision.** A Vite single-page app. Everything the MVP needs runs client-side, so a static bundle is the simplest thing that works and deploys anywhere (including Cloudflare Pages). When a server is needed (sending via SES, D1 persistence) `@cloudflare/vite-plugin` 1.54 adds a Worker to the same project without switching frameworks.
**Alternatives.** Next.js 16 gives API routes today, but adds routing, RSC and server concepts that the MVP does not use and a beginner must learn. Running arbitrary TSX on a server is also a worse default than running it in the author's browser.
**Consequences.** No SSR; no server code yet; `npm run build` produces static files.

## ADR-4 Motion: beUI selectively

**Context.** The brief asks for beUI where motion communicates state, and for reduced-motion support.
**Finding.** beUI is not an npm package; it is a shadcn-compatible registry (`npx shadcn@latest add @beui/<name>`) of MIT-licensed components built on `motion/react`, each calling `useReducedMotion()`.
**Decision.** Vendor one component, `animated-badge`, and use it for the two places where a state _change_ is the message: payload validation state and preview render state (its `loading` status pulses while rendering). Its colours were remapped to the studio's status tokens. Tabs, toasts and collapsibles stay on shadcn/Radix + sonner because accessibility there is already solved. Device switching uses a CSS width transition with `motion-reduce:transition-none`.
**Consequences.** `motion` 13.2 is a dependency (≈45 KB gzip). beUI code is unversioned; it is treated as local code after install (do not re-run `shadcn add` over it without a diff).

## ADR-5 Editor: CodeMirror 6

**Decision.** `@uiw/react-codemirror` with `@codemirror/lang-javascript` (`{ jsx: true, typescript: true }`), `@codemirror/lang-json` + `jsonParseLinter`, `@codemirror/lang-html` for the read-only HTML tab and `@codemirror/theme-one-dark`.
**Why.** Roughly 176 KB gzip for the whole stack versus more than 1 MB plus worker configuration for Monaco; React 19 compatible; accessible by default (`role="textbox"`, `aria-label` via `contentAttributes`, Escape-then-Tab to leave the editor).
**Consequences.** No TypeScript IntelliSense in the editor. A later milestone can add type-aware hints if wanted.

## ADR-6/7/8 Compile, render and isolate in the browser

See `docs/ARCHITECTURE.md` for the mechanism. Key facts verified: sucrase `transforms: ['typescript','jsx','imports']` with `jsxRuntime: 'automatic'` and `production: true` emits CommonJS whose `require` calls we control; `@react-email/render` selects a DOM-free build under the `browser`/`worker` export conditions; Prism.js needs `globalThis.Prism = { manual: true, disableWorkerMessageHandler: true }` before it loads inside a worker.

## ADR-9 Validation with Zod, behind a domain interface

Templates declare a `z.strictObject` schema in the registry; `zodPropsValidator` adapts it to the domain's `PropsValidator` so the domain and application layers never import Zod. `strictObject` flags unknown keys, which catches typos in payloads.

## ADR-11 Testing strategy

- Pure modules (compile, evaluate, render, parse, reducer, diagnostics, session store, worker hardening) have Vitest unit tests in the Node environment. The render test proves each sample template renders with its sample payload.
- Components and hooks use jsdom with Testing Library (`// @vitest-environment jsdom`).
- Anything that depends on a real browser (Web Worker, iframe sandbox, timeout) is covered by Playwright against `vite preview` of the production build, so the worker bundle itself is tested.
