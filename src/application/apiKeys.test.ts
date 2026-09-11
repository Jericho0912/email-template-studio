import { describe, expect, it } from 'vitest'
import { createApiKeyToken, displayApiKeyPrefix, normalizeApiKeyEnvironment } from './apiKeys'

describe('api key helpers', () => {
  it('creates a stable environment-prefixed token from injected bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 250, 251, 252, 253, 254, 255, 16, 17, 18, 19])

    expect(createApiKeyToken('staging', bytes)).toBe('st_staging_AAECAwQF-vv8_f7_EBESEw')
  })

  it('formats display prefixes without exposing the full token', () => {
    expect(displayApiKeyPrefix('st_local_AAECAwQF-vv8_f7_EBESEw')).toBe('st_local_AAECAwQ…')
  })

  it('normalizes unknown environment labels to local', () => {
    expect(normalizeApiKeyEnvironment('Production')).toBe('production')
    expect(normalizeApiKeyEnvironment('Local')).toBe('local')
  })
})
