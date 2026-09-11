export type ApiKeyEnvironment = 'local' | 'development' | 'staging' | 'production'

const TOKEN_BYTE_LENGTH = 16

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/**
 * Creates a display token for the in-browser API key mock. The Worker will own
 * real token generation and hashing once API keys authenticate requests.
 */
export function createApiKeyToken(environment: ApiKeyEnvironment, bytes?: Uint8Array): string {
  const entropy = bytes ?? crypto.getRandomValues(new Uint8Array(TOKEN_BYTE_LENGTH))
  return `st_${environment}_${toBase64Url(entropy)}`
}

export function displayApiKeyPrefix(token: string): string {
  return `${token.slice(0, 16)}…`
}

export function normalizeApiKeyEnvironment(label: string): ApiKeyEnvironment {
  const normalized = label.toLowerCase()
  if (normalized === 'production' || normalized === 'staging' || normalized === 'development')
    return normalized
  return 'local'
}
