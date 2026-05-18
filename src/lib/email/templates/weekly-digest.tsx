import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface DigestTutorial {
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
  published_at: string;
  clicks_week: number;
}

export interface DigestProps {
  weekStart: string;          // YYYY-MM-DD
  weekEnd: string;             // YYYY-MM-DD
  tutorials: DigestTutorial[];
  totalClicksWeek: number;
  topProductName: string | null;
  topProductClicks: number;
}

const BLOG_URL = "https://www.mechatronicstore.cl/blog";
const ADMIN_URL = "https://www.mechatronicstore.cl/admin/blog";

export default function WeeklyDigest({
  weekStart,
  weekEnd,
  tutorials,
  totalClicksWeek,
  topProductName,
  topProductClicks,
}: DigestProps) {
  const previewText =
    tutorials.length > 0
      ? `${tutorials.length} tutoriales publicados, ${totalClicksWeek} clicks a productos`
      : `Sin publicaciones esta semana, ${totalClicksWeek} clicks acumulados`;

  return (
    <Html lang="es">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={h1Style}>
            📚 Blog MechatronicStore — semana del {weekStart} al {weekEnd}
          </Heading>

          <Section style={metricsStyle}>
            <Text style={metricNumStyle}>{tutorials.length}</Text>
            <Text style={metricLabelStyle}>publicados</Text>

            <Text style={metricNumStyle}>{totalClicksWeek}</Text>
            <Text style={metricLabelStyle}>clicks a tienda</Text>

            {topProductName && (
              <>
                <Text style={metricNumStyle}>{topProductClicks}</Text>
                <Text style={metricLabelStyle}>
                  top: {topProductName}
                </Text>
              </>
            )}
          </Section>

          <Hr style={hrStyle} />

          {tutorials.length === 0 ? (
            <Section>
              <Text style={paraStyle}>
                <b>Sin publicaciones nuevas esta semana.</b>
              </Text>
              <Text style={paraStyle}>
                Si esto persiste por más de 7 días, revisar:
              </Text>
              <ul>
                <li>
                  <Link href={ADMIN_URL + "/queue"}>
                    /admin/blog/queue
                  </Link>{" "}
                  — ¿hay candidatos pendientes?
                </li>
                <li>
                  <Link href={ADMIN_URL + "/rejected"}>
                    /admin/blog/rejected
                  </Link>{" "}
                  — ¿filtros están rechazando todo?
                </li>
                <li>
                  Logs de routines blog-ingest / blog-ranking / blog-translate
                  (Anthropic Cloud).
                </li>
              </ul>
            </Section>
          ) : (
            <Section>
              <Heading as="h2" style={h2Style}>
                Publicados esta semana
              </Heading>
              {tutorials.map((t) => (
                <Section key={t.slug} style={cardStyle}>
                  {t.hero_image_url && (
                    <Img
                      src={t.hero_image_url}
                      width="600"
                      height="auto"
                      alt={t.title}
                      style={imgStyle}
                    />
                  )}
                  <Heading as="h3" style={h3Style}>
                    <Link
                      href={`${BLOG_URL}/${t.slug}`}
                      style={linkStyle}
                    >
                      {t.title}
                    </Link>
                  </Heading>
                  {t.subtitle && (
                    <Text style={subtitleStyle}>{t.subtitle}</Text>
                  )}
                  <Text style={metaStyle}>
                    Publicado {t.published_at.slice(0, 10)} ·{" "}
                    <b>{t.clicks_week}</b> clicks a productos esta semana
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={hrStyle} />

          <Text style={footerStyle}>
            <Link href={ADMIN_URL}>📊 Dashboard admin</Link> ·{" "}
            <Link href={ADMIN_URL + "/conversion"}>📈 Conversión</Link>
          </Text>
          <Text style={footerSmallStyle}>
            Este email lo genera Routine F (blog weekly digest) los lunes
            11:30 UTC. Para cambiar la cadencia: editar trigger CCR o ver
            docs/routines/blog-weekly-digest-prompt.md.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f7f9",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: "24px 0",
};
const containerStyle = {
  maxWidth: "640px",
  margin: "0 auto",
  background: "#ffffff",
  padding: "24px",
  borderRadius: "8px",
};
const h1Style = { fontSize: "22px", margin: "0 0 16px 0", color: "#0f172a" };
const h2Style = { fontSize: "18px", margin: "24px 0 12px 0", color: "#0f172a" };
const h3Style = { fontSize: "16px", margin: "8px 0", color: "#0f172a" };
const paraStyle = { fontSize: "14px", lineHeight: "20px", color: "#334155" };
const subtitleStyle = { fontSize: "14px", color: "#475569", margin: "4px 0" };
const metaStyle = { fontSize: "12px", color: "#64748b", margin: "8px 0 0 0" };
const linkStyle = { color: "#0ea5e9", textDecoration: "none" };
const cardStyle = {
  padding: "12px 0",
  borderBottom: "1px solid #e2e8f0",
};
const imgStyle = {
  borderRadius: "6px",
  width: "100%",
  height: "auto",
  marginBottom: "8px",
};
const hrStyle = { borderColor: "#e2e8f0", margin: "20px 0" };
const metricsStyle = {
  display: "block",
  padding: "12px",
  background: "#f1f5f9",
  borderRadius: "6px",
  textAlign: "center" as const,
};
const metricNumStyle = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#0ea5e9",
  display: "inline-block",
  margin: "0 12px",
};
const metricLabelStyle = {
  fontSize: "11px",
  color: "#64748b",
  display: "inline-block",
  textTransform: "uppercase" as const,
  margin: "0 16px 0 0",
};
const footerStyle = {
  fontSize: "13px",
  color: "#475569",
  textAlign: "center" as const,
  margin: "12px 0 4px 0",
};
const footerSmallStyle = {
  fontSize: "11px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: 0,
};
