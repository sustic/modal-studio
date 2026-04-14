import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  organisationName: string;
  inviteUrl: string;
}

export function InvitationEmail({ organisationName, inviteUrl }: Props) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>You've been invited to join {organisationName} on Modal Studio</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / wordmark */}
          <Section style={logoSection}>
            <table cellPadding={0} cellSpacing={0} style={{ margin: "0 auto" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "8px", verticalAlign: "middle" }}>
                    <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                      <rect width="18" height="18" rx="4" fill="#5B5BD6" />
                      <path
                        d="M5 9.5 L7.5 7 L9 9 L10.5 7 L13 9.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span style={wordmark}>Modal Studio</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={divider} />

          {/* Heading */}
          <Section style={section}>
            <Text style={heading}>
              You've been invited to join{" "}
              <span style={highlight}>{organisationName}</span>
            </Text>
            <Text style={body_text}>
              Modal Studio is a professional tool for managing NVH component
              resonance frequencies. Your team is waiting for you.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={inviteUrl} style={button}>
              Accept Invitation
            </Button>
          </Section>

          {/* Fallback link */}
          <Section style={section}>
            <Text style={fallbackLabel}>Or copy this link into your browser:</Text>
            <Text style={fallbackUrl}>{inviteUrl}</Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={section}>
            <Text style={footer}>This invitation expires in 7 days.</Text>
            <Text style={footer}>
              If you weren't expecting this invitation, you can safely ignore this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily: "Inter, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "520px",
  padding: "0",
  overflow: "hidden",
};

const logoSection: React.CSSProperties = {
  padding: "28px 32px 24px",
};

const wordmark: React.CSSProperties = {
  color: "#0a0a0a",
  fontSize: "15px",
  fontWeight: "600",
  letterSpacing: "-0.01em",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e5e5",
  margin: "0",
};

const section: React.CSSProperties = {
  padding: "24px 32px 0",
};

const heading: React.CSSProperties = {
  color: "#0a0a0a",
  fontSize: "20px",
  fontWeight: "600",
  letterSpacing: "-0.02em",
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const highlight: React.CSSProperties = {
  color: "#5B5BD6",
};

const body_text: React.CSSProperties = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "24px 32px",
};

const button: React.CSSProperties = {
  backgroundColor: "#5B5BD6",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "500",
  padding: "11px 24px",
  textDecoration: "none",
};

const fallbackLabel: React.CSSProperties = {
  color: "#737373",
  fontSize: "12px",
  margin: "0 0 6px",
};

const fallbackUrl: React.CSSProperties = {
  color: "#5B5BD6",
  fontSize: "12px",
  margin: "0",
  wordBreak: "break-all",
};

const footer: React.CSSProperties = {
  color: "#a3a3a3",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 4px",
};
