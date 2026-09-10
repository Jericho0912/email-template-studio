/**
 * Turns a parsed configuration into the sender the API should use.
 *
 * Both adapters (`server/node.ts` and `worker/index.ts`) call this, so the rule
 * "disabled -> no sender, dry run -> fake sender, otherwise -> Amazon SES" is
 * written once and cannot drift between the two runtimes.
 */
import type { SendServerConfig } from './config.ts'
import { ConfigError } from './config.ts'
import type { EmailSender } from './emailSender.ts'
import { createDryRunSender } from './emailSender.ts'
import { createSesSender } from './sesSender.ts'

/** Returns null when sending is switched off; the API then answers 503 with the reason. */
export function createSender(config: SendServerConfig): EmailSender | null {
  if (!config.enabled) return null
  if (config.dryRun) return createDryRunSender()
  // loadConfig already refuses a live setup without credentials; this guard is
  // what convinces TypeScript, and it fails loudly rather than sending silently.
  if (!config.credentials) {
    throw new ConfigError('Live sending needs AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
  }
  return createSesSender({
    region: config.region,
    credentials: config.credentials,
    configurationSet: config.configurationSet,
  })
}
