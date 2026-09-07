/**
 * Local send server entry point. Run with `npm run server` (reads .env if present).
 * Binds to 127.0.0.1 only: this is a developer-machine tool, not a public service.
 */
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { ConfigError, loadConfig } from './config.ts'
import { createDryRunSender, createSesSender } from './emailSender.ts'

function main(): void {
  let config
  try {
    config = loadConfig(process.env)
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n${error.message}\n`)
      process.exit(1)
    }
    throw error
  }

  const sender = !config.enabled
    ? null
    : config.dryRun
      ? createDryRunSender()
      : createSesSender({ region: config.region, configurationSet: config.configurationSet })

  const app = createApp({ config, sender })
  serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
    const base = `http://127.0.0.1:${info.port}`
    if (config.enabled && sender) {
      console.log(
        `Send server listening on ${base}\n  mode: ${sender.mode}\n  region: ${config.region}\n  from: ${config.from}\n  allowed recipients: ${config.allowedRecipients.join(', ')}\n  rate limit: ${config.rateLimitPerMinute}/min`,
      )
      void sender.preflight(config.from).then((result) => {
        console.log(`  preflight: ${result.ok ? 'OK' : 'PROBLEM'} - ${result.message}`)
      })
    } else {
      const reason = config.enabled ? 'no sender configured' : config.reason
      console.log(`Send server listening on ${base} with sending DISABLED (${reason})`)
    }
  })
}

main()
