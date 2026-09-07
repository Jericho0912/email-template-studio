import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

/**
 * Password reset email. Optional props show how to model "may be missing"
 * fields: the request details section is only rendered when both are present.
 */
export interface PasswordResetProps {
  recipientName: string
  resetUrl: string
  expiresInMinutes: number
  productName: string
  requestIp?: string
  requestLocation?: string
}

export default function PasswordResetEmail({
  recipientName,
  resetUrl,
  expiresInMinutes,
  productName,
  requestIp,
  requestLocation,
}: PasswordResetProps) {
  const hasRequestDetails = Boolean(requestIp && requestLocation)

  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your {productName} password</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Text style={styles.eyebrow}>{productName} security</Text>
            <Heading as="h1" style={styles.heading}>
              Reset your password
            </Heading>
            <Text style={styles.paragraph}>
              Hi {recipientName}, we received a request to reset the password for your account. This link is
              valid for {expiresInMinutes} minutes.
            </Text>
            <Button href={resetUrl} style={styles.button}>
              Choose a new password
            </Button>
          </Section>
          {hasRequestDetails ? (
            <Section style={styles.detailBox}>
              <Text style={styles.detailLabel}>Request details</Text>
              <Text style={styles.detailValue}>IP address: {requestIp}</Text>
              <Text style={styles.detailValue}>Approximate location: {requestLocation}</Text>
            </Section>
          ) : null}
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            If you did not request a password reset, you can safely ignore this email. Your password will not
            change.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

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
    color: '#b45309',
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
  detailBox: {
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    marginTop: 24,
    padding: '12px 16px',
  },
  detailLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    margin: '0 0 6px',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#3f3f46',
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: 13,
    lineHeight: '20px',
    margin: 0,
  },
  divider: { borderColor: '#e4e4e7', margin: '32px 0 16px' },
  footer: { color: '#a1a1aa', fontSize: 12, lineHeight: '18px', margin: 0 },
} satisfies Record<string, React.CSSProperties>
