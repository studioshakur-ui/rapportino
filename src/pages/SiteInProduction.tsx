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
  maxWidth: 520,
  width: "100%",
};

const cardStyles: React.CSSProperties = {
  position: "relative",
  borderRadius: 24,
  padding: "32px 28px 26px",
  background: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(148, 163, 184, 0.5)",
  boxShadow:
    "0 24px 70px rgba(15, 23, 42, 0.9), 0 0 0 1px rgba(15, 23, 42, 0.9)",
  backdropFilter: "blur(20px)",
  overflow: "hidden",
};

const cardGradientOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top center, rgba(129, 140, 248, 0.24), transparent 55%)",
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
  width: 38,
  height: 38,
  borderRadius: 999,
  background:
    "radial-gradient(circle at 30% 0, #f97316, #a855f7 55%, #4f46e5)",
  boxShadow:
    "0 0 0 1px rgba(15, 23, 42, 0.9), 0 18px 45px rgba(15, 23, 42, 1)",
};

const logoTextStyles: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#f9fafb",
  letterSpacing: "0.08em",
};

const brandNameStyles: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.14em",
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
  padding: "6px 12px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  border: "1px solid rgba(148, 163, 184, 0.6)",
  background: "rgba(15, 23, 42, 0.9)",
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
  border: "1px solid rgba(129, 140, 248, 0.7)",
  background: "rgba(79, 70, 229, 0.15)",
  color: "#e5e7eb",
  fontSize: 11,
  fontWeight: 500,
  padding: "6px 12px",
  marginBottom: 12,
};

const badgeDotStyles: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  border: "1px solid rgba(248, 250, 252, 0.9)",
  background: "#6366f1",
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
  lineHeight: 1.6,
};

const metaSectionStyles: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 20,
  paddingTop: 14,
  borderTop: "1px dashed rgba(148, 163, 184, 0.5)",
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
  letterSpacing: "0.14em",
  color: "rgba(148, 163, 184, 0.95)",
};

const metaValueStyles: React.CSSProperties = {
  fontSize: 13,
  color: "#e5e7eb",
  fontWeight: 500,
};

const metaContactStyles: React.CSSProperties = {
  fontSize: 13,
  color: "#9ca3af",
  marginTop: 4,
};

const metaContactLinkStyles: React.CSSProperties = {
  color: "#e5e7eb",
  textDecoration: "none",
  borderBottom: "1px solid rgba(248, 250, 252, 0.5)",
  paddingBottom: 1,
};

const footerStyles: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 14,
  borderTop: "1px solid rgba(15, 23, 42, 0.95)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 11,
  color: "rgba(148, 163, 184, 0.95)",
};

const chipStyles: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.7)",
  padding: "4px 9px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
};

export const SiteInProduction: React.FC = () => {
  return (
    <div style={pageStyles}>
      {/* Gradient di sfondo in stile CORE */}
      <div
        style={{
          position: "fixed",
          inset: "-40%",
          background:
            "radial-gradient(circle at top left, #6366f1, #0f172a 55%, #020617)",
          opacity: 0.95,
          filter: "blur(42px)",
          zIndex: -2,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(15,23,42,0.7), transparent), radial-gradient(circle at bottom, rgba(15,23,42,0.95), transparent)",
          zIndex: -1,
        }}
      />

      <main style={wrapStyles} aria-label="Sito in produzione">
        <section style={cardStyles}>
          <div style={cardGradientOverlay} aria-hidden />

          <header style={cardHeaderStyles}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={logoMarkStyles} aria-hidden>
                {/* Metti qui le iniziali che vuoi: es. "CR" per CORE Rapportino */}
                <span style={logoTextStyles}>CR</span>
              </div>
              <div>
                {/* Nome brand in stile CORE */}
                <div style={brandNameStyles}>CORE · Rapportino</div>
                <div style={brandTaglineStyles}>
                  Piattaforma operativa in aggiornamento
                </div>
              </div>
            </div>

            <div style={statusPillStyles}>
              <span style={statusDotStyles} aria-hidden />
              <span>Sito in produzione</span>
            </div>
          </header>

          <div style={titleBlockStyles}>
            <div style={badgeStyles}>
              <span style={badgeDotStyles} aria-hidden />
              <span>Stiamo migliorando l&rsquo;esperienza</span>
            </div>

            <h1 style={titleStyles}>Il sito è attualmente in aggiornamento.</h1>
            <p style={subtitleStyles}>
              Stiamo finalizzando una versione ottimizzata per garantire{" "}
              <strong>prestazioni</strong>, <strong>stabilità</strong> e{" "}
              <strong>sicurezza</strong>. Ti ringraziamo per la pazienza e la
              fiducia.
            </p>
          </div>

          <div style={metaSectionStyles}>
            <div style={metaRowStyles}>
              <div style={metaLabelStyles}>Stato</div>
              <div style={metaValueStyles}>Messa in produzione in corso</div>
            </div>
            <div style={metaRowStyles}>
              <div style={metaLabelStyles}>Accesso</div>
              <div style={metaValueStyles}>Temporaneamente non disponibile</div>
            </div>
            <p style={metaContactStyles}>
              Per esigenze operative o urgenze, puoi contattarci a{" "}
              <a
                href="mailto:core@tuodominio.com"
                style={metaContactLinkStyles}
              >
                core@tuodominio.com
              </a>
              .
            </p>
          </div>

          <footer style={footerStyles}>
            <span>Ambiente di pre-produzione</span>
            <span style={chipStyles}>Nuova release in arrivo</span>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default SiteInProduction;
