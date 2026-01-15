// src/pages/SiteInProduction.tsx
import React from "react";

const pageStyles: React.CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  padding: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  position: "relative",
  overflow: "hidden",
};

const wrapStyles: React.CSSProperties = {
  maxWidth: 480,
  width: "100%",
};

const cardStyles: React.CSSProperties = {
  position: "relative",
  borderRadius: 24,
  padding: "32px 28px 26px",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  boxShadow:
    "0 22px 60px rgba(15, 23, 42, 0.8), 0 0 0 1px rgba(15, 23, 42, 0.8)",
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

const cardGradientOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top center, rgba(148, 163, 255, 0.22), transparent 55%)",
  pointerEvents: "none",
};

const cardHeaderStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
  position: "relative",
  zIndex: 1,
};

const logoMarkStyles: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 999,
  background:
    "radial-gradient(circle at 30% 0, #f97316, #a855f7 55%, #4f46e5)",
  boxShadow:
    "0 0 0 1px rgba(15, 23, 42, 0.8), 0 16px 40px rgba(15, 23, 42, 0.9)",
};

const logoTextStyles: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#f9fafb",
  letterSpacing: "0.06em",
};

const brandNameStyles: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#e5e7eb",
};

const brandTaglineStyles: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
};

const statusPillStyles: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "6px 11px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "rgba(15, 23, 42, 0.85)",
  backdropFilter: "blur(16px)",
  color: "#e5e7eb",
};

const statusDotStyles: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "#22c55e",
  boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.25)",
};

const titleBlockStyles: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  marginBottom: 18,
};

const badgeStyles: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "rgba(168, 85, 247, 0.15)",
  color: "#e5e7eb",
  fontSize: 11,
  fontWeight: 500,
  padding: "6px 11px",
  marginBottom: 12,
};

const badgeDotStyles: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  border: "1px solid rgba(248, 250, 252, 0.9)",
  background: "#a855f7",
};

const titleStyles: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1.3,
  letterSpacing: "0.01em",
  marginBottom: 8,
};

const subtitleStyles: React.CSSProperties = {
  fontSize: 14,
  color: "#9ca3af",
  lineHeight: 1.5,
};

const metaSectionStyles: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px dashed rgba(148, 163, 184, 0.4)",
};

const metaRowStyles: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
};

const metaLabelStyles: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  color: "rgba(148, 163, 184, 0.9)",
};

const metaValueStyles: React.CSSProperties = {
  fontSize: 13,
  color: "#e5e7eb",
  fontWeight: 500,
};

const metaContactStyles: React.CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
};

const metaContactLinkStyles: React.CSSProperties = {
  color: "#e5e7eb",
  textDecoration: "none",
  borderBottom: "1px solid rgba(248, 250, 252, 0.45)",
  paddingBottom: 1,
};

const footerStyles: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(15, 23, 42, 0.9)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 11,
  color: "rgba(148, 163, 184, 0.9)",
};

const chipStyles: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.45)",
  padding: "4px 9px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

export const SiteInProduction: React.FC = () => {
  return (
    <div style={pageStyles}>
      {/* Background gradients */}
      <div
        style={{
          position: "fixed",
          inset: "-40%",
          background:
            "radial-gradient(circle at top left, #7c3aed, #0f172a 55%, #020617)",
          opacity: 0.9,
          filter: "blur(40px)",
          zIndex: -2,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(15,23,42,0.6), transparent), radial-gradient(circle at bottom, rgba(15,23,42,0.9), transparent)",
          zIndex: -1,
        }}
      />

      <main style={wrapStyles} aria-label="Site en production">
        <section style={cardStyles}>
          <div style={cardGradientOverlay} aria-hidden />
          <header style={cardHeaderStyles}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={logoMarkStyles} aria-hidden>
                {/* Remplace ST par les initiales de ta marque */}
                <span style={logoTextStyles}>ST</span>
              </div>
              <div>
                {/* Remplace par le nom de ta plateforme */}
                <div style={brandNameStyles}>Studio / Plateforme</div>
                <div style={brandTaglineStyles}>
                  Nouvelle version en préparation
                </div>
              </div>
            </div>
            <div style={statusPillStyles}>
              <span style={statusDotStyles} aria-hidden />
              <span>Site en production</span>
            </div>
          </header>

          <div style={titleBlockStyles}>
            <div style={badgeStyles}>
              <span style={badgeDotStyles} aria-hidden />
              <span>Nous optimisons l&rsquo;expérience</span>
            </div>
            <h1 style={titleStyles}>Le site est actuellement en production.</h1>
            <p style={subtitleStyles}>
              Nous finalisons une version optimisée pour garantir{" "}
              <strong>performance</strong>, <strong>stabilité</strong> et{" "}
              <strong>sécurité</strong>. Merci pour votre patience.
            </p>
          </div>

          <div style={metaSectionStyles}>
            <div style={metaRowStyles}>
              <div style={metaLabelStyles}>Statut</div>
              <div style={metaValueStyles}>Mise en ligne en préparation</div>
            </div>
            <div style={metaRowStyles}>
              <div style={metaLabelStyles}>Accès</div>
              <div style={metaValueStyles}>Temporairement indisponible</div>
            </div>
            <p style={metaContactStyles}>
              Pour toute demande urgente, vous pouvez nous contacter à{" "}
              <a
                href="mailto:contact@votre-domaine.com"
                style={metaContactLinkStyles}
              >
                contact@votre-domaine.com
              </a>
              .
            </p>
          </div>

          <footer style={footerStyles}>
            <span>Version de pré-production</span>
            <span style={chipStyles}>Bientôt disponible</span>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default SiteInProduction;