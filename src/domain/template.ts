/**
 * Domain model: email templates.
 *
 * The domain layer holds plain TypeScript types and tiny pure helpers only.
 * It must not import React, Zod, Vite or browser APIs, so the core concepts
 * stay easy to read and easy to unit test.
 */
import type { PropsValidator } from './preview'

/**
 * A "branded" string. At runtime it is just a string, but TypeScript will
 * refuse to pass any random string where a TemplateId is expected.
 */
export type TemplateId = string & { readonly __brand: 'TemplateId' }

/** Create a TemplateId from a plain string (used by the local template registry). */
export function templateId(value: string): TemplateId {
  return value as TemplateId
}

/** Controlled vocabulary for library cards and filters. */
export type TemplateCategory = 'onboarding' | 'security' | 'collaboration' | 'billing' | 'notification'

/** Lifecycle status shown on each library card. */
export type TemplateStatus = 'draft' | 'ready' | 'deprecated'

/** Only React Email TSX templates are supported in the MVP. */
export type TemplateFileType = 'tsx'

export interface TemplateVersion {
  /** Monotonic number, e.g. 3. */
  readonly number: number
  /** Human readable label, e.g. "v3". */
  readonly label: string
  /** ISO-8601 timestamp of when this version was created. */
  readonly createdAt: string
}

export interface EmailAddress {
  readonly name: string
  readonly address: string
}

export interface TemplateMetadata {
  readonly id: TemplateId
  readonly name: string
  /** URL/file friendly identifier, e.g. "welcome-verification". */
  readonly slug: string
  /** File name shown in the editor chrome, e.g. "welcome-verification.email.tsx". */
  readonly fileName: string
  readonly description: string
  readonly category: TemplateCategory
  readonly status: TemplateStatus
  readonly version: TemplateVersion
  readonly fileType: TemplateFileType
  /** Subject line shown in the preview mail frame. */
  readonly subject: string
  readonly from: EmailAddress
  /** Sample recipient shown in the preview mail frame. Never used for sending. */
  readonly to: EmailAddress
  /** ISO-8601 timestamp of the last change to the original template. */
  readonly updatedAt: string
}

/**
 * A template as stored in the local repository.
 * `source` and `samplePayloadText` are the ORIGINAL values. Edits never mutate
 * them; they live in session drafts (see application/studioState.ts).
 */
export interface EmailTemplate {
  readonly metadata: TemplateMetadata
  /** Original React Email TSX source. */
  readonly source: string
  /** Original sample props as pretty-printed JSON text. */
  readonly samplePayloadText: string
  /** Checks an unknown JSON value against this template's props contract. */
  readonly validateProps: PropsValidator
}
