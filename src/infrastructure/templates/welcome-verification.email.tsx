import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * Welcome + account verification email.
 *
 * Studio rules for template files:
 * - Only import from 'react' and '@react-email/components'.
 * - `export default` exactly one component; its props come from the preview payload.
 * - Keep styles inline (email clients ignore most stylesheets).
 */
export interface WelcomeVerificationProps {
  recipientName: string
  verificationUrl: string
  expiresInHours: number
  productName: string
  supportEmail: string
}

export default function WelcomeVerificationEmail({
  recipientName,
  verificationUrl,
  expiresInHours,
  productName,
  supportEmail,
}: WelcomeVerificationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Verify your email to finish setting up {productName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Text style={styles.eyebrow}>{productName}</Text>
            <Heading as="h1" style={styles.heading}>
              Welcome, {recipientName}
            </Heading>
            <Text style={styles.paragraph}>
              Confirm your email address to activate your account. This link expires in {expiresInHours}{' '}
              hours.
            </Text>
            <Button href={verificationUrl} style={styles.button}>
              Verify email address
            </Button>
            <Text style={styles.muted}>If the button does not work, paste this link into your browser:</Text>
            <Link href={verificationUrl} style={styles.link}>
              {verificationUrl}
            </Link>
          </Section>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            You received this email because an account was created with this address. If that was not you,
            contact{' '}
            <Link href={`mailto:${supportEmail}`} style={styles.link}>
              {supportEmail}
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// `satisfies` keeps autocomplete for each key while checking every value is valid CSS.
const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily: 'Helvetica, Arial, sans-serif',
    margin: 0,
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e4e4e7',
    borderRadius: 8,
    margin: '0 auto',
    maxWidth: 560,
    padding: '32px 40px',
  },
  eyebrow: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    margin: '0 0 16px',
    textTransform: 'uppercase',
  },
  heading: { color: '#18181b', fontSize: 24, fontWeight: 600, lineHeight: '32px', margin: '0 0 12px' },
  paragraph: { color: '#3f3f46', fontSize: 15, lineHeight: '24px', margin: '0 0 24px' },
  button: {
    backgroundColor: '#18181b',
    borderRadius: 6,
    color: '#ffffff',
    display: 'inline-block',
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 20px',
    textDecoration: 'none',
  },
  muted: { color: '#71717a', fontSize: 13, lineHeight: '20px', margin: '24px 0 4px' },
  link: { color: '#2563eb', fontSize: 13, textDecoration: 'underline', wordBreak: 'break-all' },
  divider: { borderColor: '#e4e4e7', margin: '32px 0 16px' },
  footer: { color: '#a1a1aa', fontSize: 12, lineHeight: '18px', margin: 0 },
} satisfies Record<string, React.CSSProperties>
