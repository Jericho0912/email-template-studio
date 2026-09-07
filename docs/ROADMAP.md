# Roadmap and backlog

Deferred on purpose. Nothing here is implemented, simulated, or wired in this MVP.

## Milestones

| Milestone | Goal                                               | Notes                                                                                                                                                    |
| --------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 (done) | Local studio: edit, validate, preview, diagnostics | This repository                                                                                                                                          |
| M2        | Test-email sending through a server-side provider  | Amazon SES behind a Cloudflare Worker; the browser never holds credentials; `EmailProvider` implementation with `canSend: true`; allow-listed recipients |
| M3        | Persistence                                        | Templates, versions and drafts in Cloudflare D1; keep the `EmailTemplate` shape; replace `registry.ts`                                                   |
| M4        | Publishing                                         | Real "publish" with versions, environment targets and an approval step                                                                                   |
| M5        | Access control                                     | Authentication and API-key management for the sending API                                                                                                |
| M6        | Delivery pipeline                                  | Cloudflare Queues + dead-letter queue for async sends and retries                                                                                        |

## Backlog (from the MVP non-goals)

- Amazon SES integration (M2)
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
