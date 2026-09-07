/**
 * Send-server configuration, read from environment variables.
 *
 * Credentials are NEVER read here. The AWS SDK resolves them itself from the
 * standard places (AWS_PROFILE + ~/.aws/credentials, or AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY environment variables). This server only decides
 * whether sending is enabled, from which verified address, to whom, and how fast.
 */
import { z } from 'zod'

/** Only the literal string "true" enables; anything else (including junk) disables. */
const flag = z.string().optional()

const envSchema = z.object({
  STUDIO_SEND_ENABLED: flag,
  /** true = go through the whole path but never call SES; returns a fake message id. */
  STUDIO_SEND_DRY_RUN: flag,
  STUDIO_SERVER_PORT: z.coerce.number().int().positive().default(8787),
  STUDIO_SEND_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
  AWS_REGION: z.string().min(1).optional(),
  /** A verified SES identity (email or an address on a verified domain). */
  SES_FROM_ADDRESS: z.email().optional(),
  /** Comma-separated allow-list. Sending to anyone else is refused. */
  SES_ALLOWED_RECIPIENTS: z.string().optional(),
  SES_CONFIGURATION_SET: z.string().min(1).optional(),
})

export type SendServerConfig =
  | { readonly enabled: false; readonly port: number; readonly reason: string }
  | {
      readonly enabled: true
      readonly port: number
      readonly dryRun: boolean
      readonly region: string
      readonly from: string
      readonly allowedRecipients: readonly string[]
      readonly configurationSet?: string
      readonly rateLimitPerMinute: number
    }

export class ConfigError extends Error {}

/** Parses process.env-like input. Throws ConfigError for an enabled but incomplete setup (fail fast). */
export function loadConfig(env: Record<string, string | undefined>): SendServerConfig {
  // `KEY=` in a .env file arrives as an empty string; treat it as unset.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ''),
  )
  const parsed = envSchema.safeParse(cleaned)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new ConfigError(`Invalid send-server environment: ${detail}`)
  }
  const values = parsed.data
  const port = values.STUDIO_SERVER_PORT

  if (values.STUDIO_SEND_ENABLED !== 'true') {
    return { enabled: false, port, reason: 'STUDIO_SEND_ENABLED is not "true" on the send server.' }
  }

  const missing: string[] = []
  if (!values.AWS_REGION) missing.push('AWS_REGION')
  if (!values.SES_FROM_ADDRESS) missing.push('SES_FROM_ADDRESS')
  const allowedRecipients = parseRecipients(values.SES_ALLOWED_RECIPIENTS)
  if (allowedRecipients.length === 0) missing.push('SES_ALLOWED_RECIPIENTS')
  if (missing.length > 0) {
    throw new ConfigError(
      `Sending is enabled but these variables are missing or empty: ${missing.join(', ')}. See .env.example.`,
    )
  }

  return {
    enabled: true,
    port,
    dryRun: values.STUDIO_SEND_DRY_RUN === 'true',
    region: values.AWS_REGION as string,
    from: values.SES_FROM_ADDRESS as string,
    allowedRecipients,
    configurationSet: values.SES_CONFIGURATION_SET,
    rateLimitPerMinute: values.STUDIO_SEND_RATE_LIMIT_PER_MINUTE,
  }
}

/** Splits the comma list, keeps original spelling, dedupes case-insensitively, rejects invalid entries loudly. */
export function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return []
  const byLowerCase = new Map<string, string>()
  const invalid: string[] = []
  for (const part of raw.split(',')) {
    const address = part.trim()
    if (!address) continue
    if (!z.email().safeParse(address).success) {
      invalid.push(address)
      continue
    }
    const key = address.toLowerCase()
    if (!byLowerCase.has(key)) byLowerCase.set(key, address)
  }
  if (invalid.length > 0) {
    throw new ConfigError(`SES_ALLOWED_RECIPIENTS contains invalid addresses: ${invalid.join(', ')}`)
  }
  return [...byLowerCase.values()]
}
