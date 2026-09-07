import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig, parseRecipients } from './config.ts'

describe('loadConfig', () => {
  it('is disabled by default and never throws for a disabled setup', () => {
    const config = loadConfig({})
    expect(config.enabled).toBe(false)
    expect(config.port).toBe(8787)
  })

  it('fails fast when enabled but incomplete', () => {
    expect(() => loadConfig({ STUDIO_SEND_ENABLED: 'true' })).toThrow(ConfigError)
    expect(() =>
      loadConfig({ STUDIO_SEND_ENABLED: 'true', AWS_REGION: 'us-east-1', SES_FROM_ADDRESS: 'a@b.co' }),
    ).toThrow(/SES_ALLOWED_RECIPIENTS/)
  })

  it('parses a complete enabled setup', () => {
    const config = loadConfig({
      STUDIO_SEND_ENABLED: 'true',
      STUDIO_SEND_DRY_RUN: 'true',
      AWS_REGION: 'us-east-1',
      SES_FROM_ADDRESS: 'sender@example.com',
      SES_ALLOWED_RECIPIENTS: 'One@Example.com, two@example.com, not-an-email',
      STUDIO_SERVER_PORT: '9000',
      STUDIO_SEND_RATE_LIMIT_PER_MINUTE: '2',
    })
    expect(config).toEqual({
      enabled: true,
      port: 9000,
      dryRun: true,
      region: 'us-east-1',
      from: 'sender@example.com',
      allowedRecipients: ['one@example.com', 'two@example.com'],
      configurationSet: undefined,
      rateLimitPerMinute: 2,
    })
  })

  it('rejects an invalid from address', () => {
    expect(() =>
      loadConfig({
        STUDIO_SEND_ENABLED: 'true',
        AWS_REGION: 'x',
        SES_FROM_ADDRESS: 'nope',
        SES_ALLOWED_RECIPIENTS: 'a@b.co',
      }),
    ).toThrow(/SES_FROM_ADDRESS/)
  })
})

describe('parseRecipients', () => {
  it('normalises, dedupes and drops junk', () => {
    expect(parseRecipients(' A@x.io ,a@x.io,, b@y.io ,junk')).toEqual(['a@x.io', 'b@y.io'])
    expect(parseRecipients(undefined)).toEqual([])
  })
})
