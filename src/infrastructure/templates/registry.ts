/**
 * Local template repository.
 *
 * In the MVP templates live in this folder as real TSX files. Vite's `?raw`
 * import gives us the exact file text for the editor, while the same files
 * are also type-checked and unit-tested as normal React components.
 *
 * Later milestones can replace this module with an API- or D1-backed
 * repository without changing the rest of the application (see docs/ROADMAP.md).
 */
import { z } from 'zod'
import { templateId, type EmailTemplate, type TemplateId } from '@/domain'
import { zodPropsValidator } from '@/infrastructure/validation/zodPropsValidator'
import welcomeVerificationSource from './welcome-verification.email.tsx?raw'
import passwordResetSource from './password-reset.email.tsx?raw'
import teamInvitationSource from './team-invitation.email.tsx?raw'

const url = z.url({ protocol: /^https?$/, message: 'Must be an http(s) URL' })

/** The fictional product used across sample data. */
export const SAMPLE_PRODUCT_NAME = 'Meridian'

const welcomeVerificationSchema = z.strictObject({
  recipientName: z.string().min(1, 'Required'),
  verificationUrl: url,
  expiresInHours: z.number().int().positive(),
  productName: z.string().min(1, 'Required'),
  supportEmail: z.email(),
})

const passwordResetSchema = z.strictObject({
  recipientName: z.string().min(1, 'Required'),
  resetUrl: url,
  expiresInMinutes: z.number().int().positive(),
  productName: z.string().min(1, 'Required'),
  requestIp: z.string().optional(),
  requestLocation: z.string().optional(),
})

const teamInvitationSchema = z.strictObject({
  inviteeName: z.string().min(1, 'Required'),
  inviterName: z.string().min(1, 'Required'),
  teamName: z.string().min(1, 'Required'),
  role: z.enum(['admin', 'member', 'viewer']),
  acceptUrl: url,
  expiresInDays: z.number().int().positive(),
  productName: z.string().min(1, 'Required'),
})

function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export const TEMPLATES: readonly EmailTemplate[] = [
  {
    metadata: {
      id: templateId('welcome-verification'),
      name: 'Welcome & verification',
      slug: 'welcome-verification',
      fileName: 'welcome-verification.email.tsx',
      description:
        'Sent after sign-up. Asks the user to confirm their email address before the account is activated.',
      category: 'onboarding',
      status: 'ready',
      version: { number: 3, label: 'v3', createdAt: '2026-08-21T09:30:00Z' },
      fileType: 'tsx',
      subject: 'Verify your email address',
      from: { name: 'Meridian', address: 'no-reply@meridian.example' },
      to: { name: 'Ada Lovelace', address: 'ada@example.com' },
      updatedAt: '2026-08-21T09:30:00Z',
    },
    source: welcomeVerificationSource,
    samplePayloadText: pretty({
      recipientName: 'Ada',
      verificationUrl: 'https://app.meridian.example/verify?token=sample-token',
      expiresInHours: 24,
      productName: SAMPLE_PRODUCT_NAME,
      supportEmail: 'support@meridian.example',
    }),
    validateProps: zodPropsValidator(welcomeVerificationSchema),
  },
  {
    metadata: {
      id: templateId('password-reset'),
      name: 'Password reset',
      slug: 'password-reset',
      fileName: 'password-reset.email.tsx',
      description:
        'Time-limited link to choose a new password, with optional request details for security context.',
      category: 'security',
      status: 'ready',
      version: { number: 5, label: 'v5', createdAt: '2026-09-02T14:05:00Z' },
      fileType: 'tsx',
      subject: 'Reset your password',
      from: { name: 'Meridian Security', address: 'security@meridian.example' },
      to: { name: 'Grace Hopper', address: 'grace@example.com' },
      updatedAt: '2026-09-02T14:05:00Z',
    },
    source: passwordResetSource,
    samplePayloadText: pretty({
      recipientName: 'Grace',
      resetUrl: 'https://app.meridian.example/reset?token=sample-token',
      expiresInMinutes: 30,
      productName: SAMPLE_PRODUCT_NAME,
      requestIp: '203.0.113.42',
      requestLocation: 'Manila, PH',
    }),
    validateProps: zodPropsValidator(passwordResetSchema),
  },
  {
    metadata: {
      id: templateId('team-invitation'),
      name: 'Team invitation',
      slug: 'team-invitation',
      fileName: 'team-invitation.email.tsx',
      description: 'Invites a person to join a team with a specific role. Uses Row/Column layout.',
      category: 'collaboration',
      status: 'draft',
      version: { number: 1, label: 'v1', createdAt: '2026-09-05T11:00:00Z' },
      fileType: 'tsx',
      subject: 'You have been invited to join a team',
      from: { name: 'Meridian', address: 'no-reply@meridian.example' },
      to: { name: 'Linus Torvalds', address: 'linus@example.com' },
      updatedAt: '2026-09-05T11:00:00Z',
    },
    source: teamInvitationSource,
    samplePayloadText: pretty({
      inviteeName: 'Linus',
      inviterName: 'Margaret Hamilton',
      teamName: 'Platform Core',
      role: 'member',
      acceptUrl: 'https://app.meridian.example/invitations/sample-token',
      expiresInDays: 7,
      productName: SAMPLE_PRODUCT_NAME,
    }),
    validateProps: zodPropsValidator(teamInvitationSchema),
  },
]

export function findTemplate(id: TemplateId): EmailTemplate | undefined {
  return TEMPLATES.find((template) => template.metadata.id === id)
}

/** Throws if the id is unknown. Use when an unknown id is a programming error. */
export function getTemplate(id: TemplateId): EmailTemplate {
  const template = findTemplate(id)
  if (!template) throw new Error(`Unknown template id: ${id}`)
  return template
}

export const DEFAULT_TEMPLATE_ID: TemplateId = TEMPLATES[0].metadata.id
