/**
 * Cloudflare Worker entry point.
 *
 * The same Hono app as the Node send server (`server/app.ts`), hosted in a
 * Worker. Static files (the built studio) are served by Cloudflare's assets
 * layer; only `/api/*` reaches this code (see `run_worker_first` in wrangler.jsonc).
 *
 * Runtime differences from `server/node.ts`:
 * - configuration comes from Worker bindings (`vars` and secrets in wrangler.jsonc,
 *   `.dev.vars` locally), not from process.env
 * - AWS credentials must be Worker secrets: an isolate has no `~/.aws` to read
 * - the host policy is `same-origin`: the Worker answers on a public hostname
 *
 * Live Amazon SES sending works here as of the aws4fetch sender (docs/SENDING.md);
 * it is switched on per environment with STUDIO_SEND_ENABLED and three secrets.
 */
import { createApp } from '../server/app.ts'
import { createAuthenticator, loadAuthConfig } from '../server/auth.ts'
import { ConfigError, loadConfig } from '../server/config.ts'
import { createSender } from '../server/createSender.ts'

type App = ReturnType<typeof createApp>

/** Built once per isolate; Workers reuse an isolate across many requests. */
let cached: { app: App } | { error: ConfigError } | null = null

/** Only string bindings (`vars` and secrets) are configuration; D1, queues etc. are not. */
function variablesOf(env: Env): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => typeof value === 'string'))
}

function buildApp(env: Env): App {
  const variables = variablesOf(env)
  const config = loadConfig(variables)
  // Cloudflare Access in production; a shared password where Access is not set
  // up yet; a fixed developer identity for `npm run dev` and the Playwright
  // suite; otherwise an authenticator that refuses everything.
  const authConfig = loadAuthConfig(variables)
  return createApp({
    config,
    sender: createSender(config),
    hostPolicy: 'same-origin',
    authenticator: createAuthenticator(authConfig),
    // Only the password mode gets a sign-in route.
    passwordGate: authConfig.mode === 'password' ? { password: authConfig.password } : undefined,
  })
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
