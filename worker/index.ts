/**
 * Cloudflare Worker entry point.
 *
 * The same Hono app as the Node send server (`server/app.ts`), hosted in a
 * Worker. Static files (the built studio) are served by Cloudflare's assets
 * layer; only `/api/*` reaches this code (see `run_worker_first` in wrangler.jsonc).
 *
 * Runtime differences from `server/node.ts`:
 * - configuration comes from Worker bindings (`vars` in wrangler.jsonc, `.dev.vars` locally), not process.env
 * - there is no Amazon SES sender yet: the AWS SDK needs Node APIs. Sending stays
 *   disabled (or dry-run) until phase 1 of docs/PLAN.md adds an `aws4fetch` sender
 * - the host policy is `same-origin`: the Worker answers on a public hostname
 */
import { createApp } from '../server/app.ts'
import { ConfigError, loadConfig } from '../server/config.ts'
import { createDryRunSender } from '../server/emailSender.ts'

type App = ReturnType<typeof createApp>

/** Built once per isolate; Workers reuse an isolate across many requests. */
let cached: { app: App } | { error: ConfigError } | null = null

/** Only string bindings (`vars` and secrets) are configuration; D1, queues etc. are not. */
function variablesOf(env: Env): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => typeof value === 'string'))
}

function buildApp(env: Env): App {
  const config = loadConfig(variablesOf(env))
  if (config.enabled && !config.dryRun) {
    // Refuse loudly rather than pretend: live sending needs the phase 1 sender.
    throw new ConfigError(
      'Live sending is not available in the Worker yet. Set STUDIO_SEND_DRY_RUN=true or STUDIO_SEND_ENABLED=false.',
    )
  }
  const sender = config.enabled ? createDryRunSender() : null
  return createApp({ config, sender, hostPolicy: 'same-origin' })
}

export default {
  async fetch(request, env, ctx) {
    if (cached === null) {
      try {
        cached = { app: buildApp(env) }
      } catch (error) {
        if (!(error instanceof ConfigError)) throw error
        cached = { error }
      }
    }
    if ('error' in cached) {
      return Response.json(
        { status: 'error', code: 'server-misconfigured', message: cached.error.message },
        { status: 500 },
      )
    }
    return cached.app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
