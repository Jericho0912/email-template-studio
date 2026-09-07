import * as React from 'react'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

/**
 * Team invitation email. Demonstrates a union-typed prop (`role`) and the
 * Row/Column layout primitives from React Email.
 */
export interface TeamInvitationProps {
  inviteeName: string
  inviterName: string
  teamName: string
  role: 'admin' | 'member' | 'viewer'
  acceptUrl: string
  expiresInDays: number
  productName: string
}

const ROLE_DESCRIPTIONS: Record<TeamInvitationProps['role'], string> = {
  admin: 'Can manage members, billing and settings.',
  member: 'Can create and edit projects.',
  viewer: 'Can view projects but not change them.',
}

export default function TeamInvitationEmail({
  inviteeName,
  inviterName,
  teamName,
  role,
  acceptUrl,
  expiresInDays,
  productName,
}: TeamInvitationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {inviterName} invited you to join {teamName} on {productName}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Text style={styles.eyebrow}>{productName}</Text>
            <Heading as="h1" style={styles.heading}>
              Join {teamName}
            </Heading>
            <Text style={styles.paragraph}>
              Hi {inviteeName}, {inviterName} has invited you to collaborate with the {teamName} team.
            </Text>
          </Section>
          <Section style={styles.roleBox}>
            <Row>
              <Column style={styles.roleLabelColumn}>
                <Text style={styles.roleLabel}>Your role</Text>
              </Column>
              <Column>
                <Text style={styles.roleName}>{role}</Text>
                <Text style={styles.roleDescription}>{ROLE_DESCRIPTIONS[role]}</Text>
              </Column>
            </Row>
          </Section>
          <Section>
            <Button href={acceptUrl} style={styles.button}>
              Accept invitation
            </Button>
            <Text style={styles.muted}>This invitation expires in {expiresInDays} days.</Text>
          </Section>
          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            If you were not expecting this invitation, you can ignore this email and no account will be
            created.
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
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    margin: '0 0 16px',
    textTransform: 'uppercase',
  },
  heading: { color: '#18181b', fontSize: 24, fontWeight: 600, lineHeight: '32px', margin: '0 0 12px' },
  paragraph: { color: '#3f3f46', fontSize: 15, lineHeight: '24px', margin: '0 0 24px' },
  roleBox: {
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 6,
    marginBottom: 24,
    padding: '12px 16px',
  },
  roleLabelColumn: { width: 96, verticalAlign: 'top' },
  roleLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    margin: 0,
    textTransform: 'uppercase',
  },
  roleName: { color: '#18181b', fontSize: 14, fontWeight: 600, margin: 0, textTransform: 'capitalize' },
  roleDescription: { color: '#52525b', fontSize: 13, lineHeight: '20px', margin: '2px 0 0' },
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
  muted: { color: '#71717a', fontSize: 13, lineHeight: '20px', margin: '16px 0 0' },
  divider: { borderColor: '#e4e4e7', margin: '32px 0 16px' },
  footer: { color: '#a1a1aa', fontSize: 12, lineHeight: '18px', margin: 0 },
} satisfies Record<string, React.CSSProperties>
