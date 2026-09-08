# Email Template Studio (MVP)

An internal studio for editing [React Email](https://react.email) templates, validating their preview data and checking the rendered result on desktop and mobile widths.

![Email Template Studio: editor and payload on the left, isolated preview and diagnostics on the right, template library below](docs/screenshots/studio-desktop.png)

**Status:** MVP plus local test sending. The browser never holds credentials: test emails go through a small local send server (`server/`) that talks to Amazon SES only when you enable it in `.env`, and only to allow-listed recipients. See `docs/SENDING.md`.

## What you can do

- Browse a small library of local templates (welcome/verification, password reset, team invitation).
- Select a template; its TSX source, sample props, metadata and preview update together.
- Edit the TSX source and the JSON preview payload in code editors with syntax highlighting.
- See JSON syntax errors and schema errors (with field paths) reported separately.
- Watch the preview re-render after a short pause, inside an isolated mail-client style frame.
- Switch between desktop and mobile widths.
- Read a diagnostics panel that only claims what it actually checks.
- Keep edits per template for the current browser session (survives refresh, not tab close).
- Reset source and payload back to the originals, with a confirmation.
- Send a test email of the current preview to an allow-listed address through the local send server (Amazon SES), or see exactly why sending is unavailable.
- Open Publish changes and see that it is a local simulation.

## Quick start

Requirements: Node.js 22 or newer (developed on Node 26.8) and npm (no pnpm/bun/yarn needed).

```bash
npm install
npm run dev        # http://localhost:5173

# optional, for test sends (second terminal; see docs/SENDING.md)
cp .env.example .env   # then edit
npm run server
```

## Scripts

| Command              | What it does                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with hot reload.                                                                |
| `npm run build`      | Type-check (`tsc -b`) and build the production bundle into `dist/`.                                       |
| `npm run preview`    | Serve the production build locally.                                                                       |
| `npm test`           | Run unit and component tests once (Vitest).                                                               |
| `npm run test:watch` | Run tests in watch mode.                                                                                  |
| `npm run test:e2e`   | Run Playwright browser tests against the production build (needs `npx playwright install chromium` once). |
| `npm run typecheck`  | Type-check without emitting files.                                                                        |
| `npm run lint`       | Lint with oxlint (the linter the Vite template ships with).                                               |
| `npm run format`     | Format with Prettier.                                                                                     |
| `npm run check`      | Typecheck, lint and unit tests in one go.                                                                 |

## How it is put together

```
src/
  domain/          Plain types: EmailTemplate, PreviewPayload, ValidationResult, RenderResult, DiagnosticItem
  application/     Use cases: parse/validate payload, studio state reducer, build diagnostics
  infrastructure/  The outside world: local template registry (+ Zod schemas), render worker pipeline,
                   browser session storage, the no-send email provider
  presentation/    React: hooks, layout, studio panels, shared components
  components/ui    shadcn/ui components (generated, editable)
  components/motion beUI animated badge (vendored, editable)
server/            Local send server: config, SES sender, HTTP API (Node runs the TS directly)
e2e/               Playwright browser tests
docs/              Assessment, architecture, decisions, technical debt, roadmap, learning guide, design
```

The dependency direction is one way: `presentation -> application -> domain`, and `infrastructure` implements what `application`/`domain` need. See `docs/ARCHITECTURE.md`.

## How rendering works, in one paragraph

Your TSX is compiled in the browser by [sucrase](https://github.com/alangpierce/sucrase) inside a Web Worker, evaluated with a `require` that only knows `react`, `react/jsx-runtime` and `@react-email/components`, rendered to HTML by React Email, and shown in an `<iframe sandbox="">` whose document carries a Content-Security-Policy that forbids scripts. A 5 second timeout terminates the worker if a template loops forever. This is a documented isolation strategy for an internal tool, not a hard security boundary; the details and residual risks are in `docs/ARCHITECTURE.md`.

## Documentation

- `docs/ASSESSMENT.md` — repository assessment, assumptions, risks, prerequisites, plan and validation commands
- `docs/ARCHITECTURE.md` — layers, render pipeline, isolation, state model
- `docs/DECISIONS.md` — architecture decision records (framework, editor, compiler, motion, testing…)
- `docs/TECH_DEBT.md` — known shortcuts and how to pay them down
- `docs/ROADMAP.md` — milestones and the backlog of deliberately deferred work
- `docs/PLAN.md` — build plan for the full application and the move to Cloudflare (phases, decisions, risks)
- `docs/LEARNING.md` — concepts to learn, mapped to the files that use them
- `docs/DESIGN.md` — visual system, tokens, microcopy and motion rules
- `docs/SENDING.md` — enabling and using test sends through Amazon SES

## Guarantees

- No AWS keys or SMTP credentials exist in the codebase; the send server relies on your AWS profile.
- The browser never talks to SES; it only talks to the local send server through the `/api` proxy.
- The send server is off unless `STUDIO_SEND_ENABLED=true`, only sends to `SES_ALLOWED_RECIPIENTS`, prefixes subjects with `[TEST]`, rate limits, and binds to loopback.
- "Publish changes" only records a timestamp in your browser session and says so.
