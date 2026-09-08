# Roadmap and backlog

Deferred on purpose. Nothing here is implemented, simulated, or wired in this MVP.

The step-by-step build and Cloudflare migration plan for M2 onwards is `docs/PLAN.md` (phases 0 to 5, decisions, risks). This file stays the short list of what is in and out of scope.

## Milestones

| Milestone | Goal                                               | Notes                                                                                                                                                   |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 (done) | Local studio: edit, validate, preview, diagnostics | This repository (PLAN phase 0 deploys it as-is)                                                                                                         |
| M2        | Test-email sending through a server-side provider  | Local half done (`server/`, see SENDING.md). Deployed half = PLAN phase 1: Cloudflare Access + SES via aws4fetch in the Worker; allow-listed recipients |
| M3        | Persistence                                        | PLAN phase 2: templates, versions and drafts in Cloudflare D1; keep the `EmailTemplate` shape; replace `registry.ts`                                    |
| M4        | Publishing                                         | PLAN phase 3: real "publish" with versions, environment targets and an approval step                                                                    |
| M5        | Access control                                     | Sign-in is PLAN phase 1 (Cloudflare Access); API keys are PLAN phase 4                                                                                  |
| M6        | Delivery pipeline                                  | PLAN phase 4: Cloudflare Queues + dead-letter queue for async sends and retries, SES feedback webhook                                                   |

## Backlog (from the MVP non-goals)

- Amazon SES integration beyond local test sends: Worker deployment, auth, bounce/complaint handling (M2)
- Cloudflare Queues and dead-letter queues (M6)
- D1 production persistence (M3)
- Authentication and API-key management (M5)
- Production publishing and template approvals (M4)
- Version history and rollback (M3/M4)
- Collaborative editing
- AI-generated email content
- Drag-and-drop email building
- Attachments
- Marketing campaigns, contact management, customer-managed domains
- Advanced deliverability analytics (SPF/DKIM/DMARC checks, spam scoring, link checking) — the diagnostics panel already reserves labelled placeholder rows

## Smaller improvements

- Create a new template from the UI (today: add a file + registry entry)
- Plain-text rendering tab (`render(..., { plainText: true })`)
- Type-aware editor hints for TSX
- Dark theme toggle
- Code-split the editor and the worker (see TECH_DEBT.md)
- Keyboard shortcuts for reset/refresh with `<Kbd>` hints
- Export rendered HTML to a file
