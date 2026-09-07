import { describe, expect, it } from 'vitest'
import { buildPreviewDocument, PREVIEW_CSP } from './previewDocument'

describe('buildPreviewDocument', () => {
  it('injects the CSP meta tag right after an existing <head>', () => {
    const doc = buildPreviewDocument('<html><head><title>x</title></head><body>hi</body></html>')
    expect(doc.indexOf('<head>')).toBeLessThan(doc.indexOf(PREVIEW_CSP))
    expect(doc.indexOf(PREVIEW_CSP)).toBeLessThan(doc.indexOf('<title>'))
  })

  it('wraps fragments in a full document', () => {
    const doc = buildPreviewDocument('<p>fragment</p>')
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain(PREVIEW_CSP)
    expect(doc).toContain('<p>fragment</p>')
  })

  it('forbids scripts in the policy', () => {
    expect(PREVIEW_CSP).toContain("default-src 'none'")
    expect(PREVIEW_CSP).not.toContain('script-src')
  })
})
