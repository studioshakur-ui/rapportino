<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Site en production</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Le site est actuellement en production. Nous finalisons une version optimisée pour garantir performance, stabilité et sécurité."
    />
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :root {
        --bg-gradient: radial-gradient(circle at top left, #7c3aed, #0f172a);
        --card-bg: rgba(15, 23, 42, 0.85);
        --card-border: rgba(148, 163, 184, 0.4);
        --accent: #a855f7;
        --accent-soft: rgba(168, 85, 247, 0.15);
        --text-main: #e5e7eb;
        --text-muted: #9ca3af;
        --pill-bg: rgba(15, 23, 42, 0.85);
      }

      body {
        min-height: 100vh;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
          "Segoe UI", sans-serif;
        background: #020617;
        color: var(--text-main);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        position: relative;
        overflow: hidden;
      }

      body::before {
        content: "";
        position: fixed;
        inset: -40%;
        background: var(--bg-gradient);
        opacity: 0.9;
        filter: blur(40px);
        z-index: -2;
      }

      body::after {
        content: "";
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at top, rgba(15, 23, 42, 0.6), transparent),
          radial-gradient(circle at bottom, rgba(15, 23, 42, 0.9), transparent);
        z-index: -1;
      }

      .orb {
        position: fixed;
        width: 220px;
        height: 220px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(129, 140, 248, 0.8), transparent);
        opacity: 0.18;
        filter: blur(4px);
        animation: float 16s ease-in-out infinite;
        pointer-events: none;
        z-index: -1;
      }

      .orb.orb-1 {
        top: 8%;
        left: 6%;
      }

      .orb.orb-2 {
        bottom: 4%;
        right: 8%;
        animation-delay: -8s;
      }

      @keyframes float {
        0% {
          transform: translate3d(0, 0, 0);
        }
        50% {
          transform: translate3d(16px, -12px, 0);
        }
        100% {
          transform: translate3d(0, 0, 0);
        }
      }

      .wrap {
        max-width: 480px;
        width: 100%;
      }

      .card {
        position: relative;
        border-radius: 24px;
        padding: 28px 24px 24px;
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        box-shadow:
          0 22px 60px rgba(15, 23, 42, 0.8),
          0 0 0 1px rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(18px);
        overflow: hidden;
      }

      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at top center,
          rgba(148, 163, 255, 0.22),
          transparent 55%
        );
        opacity: 1;
        pointer-events: none;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
      }

      .logo-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: radial-gradient(circle at 30% 0, #f97316, #a855f7 55%, #4f46e5);
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.8),
          0 16px 40px rgba(15, 23, 42, 0.9);
      }

      .logo-initials {
        font-size: 18px;
        font-weight: 700;
        color: #f9fafb;
        letter-spacing: 0.06em;
      }

      .brand {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .brand-name {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #e5e7eb;
      }

      .brand-tagline {
        font-size: 12px;
        color: var(--text-muted);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 6px 11px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: var(--pill-bg);
        backdrop-filter: blur(16px);
        color: #e5e7eb;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
        animation: pulse 1.8s ease-out infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        70% {
          transform: scale(1.8);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 0;
        }
      }

      .title-block {
        position: relative;
        z-index: 1;
        margin-bottom: 18px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.4);
        background: var(--accent-soft);
        color: #e5e7eb;
        font-size: 11px;
        font-weight: 500;
        padding: 6px 11px;
        margin-bottom: 12px;
      }

      .badge-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        border: 1px solid rgba(248, 250, 252, 0.9);
        background: var(--accent);
      }

      .title {
        font-size: 24px;
        line-height: 1.3;
        letter-spacing: 0.01em;
        margin-bottom: 8px;
      }

      .subtitle {
        font-size: 14px;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .meta {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px dashed rgba(148, 163, 184, 0.4);
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }

      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.13em;
        color: rgba(148, 163, 184, 0.9);
      }

      .meta-value {
        font-size: 13px;
        color: #e5e7eb;
        font-weight: 500;
      }

      .meta-contact {
        font-size: 13px;
        color: var(--text-muted);
      }

      .meta-contact a {
        color: #e5e7eb;
        text-decoration: none;
        border-bottom: 1px solid rgba(248, 250, 252, 0.45);
        padding-bottom: 1px;
      }

      .meta-contact a:hover {
        border-bottom-color: rgba(248, 250, 252, 0.9);
      }

      .footer {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid rgba(15, 23, 42, 0.9);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: rgba(148, 163, 184, 0.9);
      }

      .chip {
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        padding: 4px 9px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      @media (min-width: 640px) {
        .card {
          padding: 32px 28px 26px;
        }
        .title {
          font-size: 26px;
        }
      }
    </style>
  </head>
  <body>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>

    <main class="wrap" aria-label="Site en production">
      <section class="card">
        <header class="card-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="logo-mark" aria-hidden="true">
              <span class="logo-initials">ST</span>
            </div>
            <div class="brand">
              <div class="brand-name">Studio / Plateforme</div>
              <div class="brand-tagline">Nouvelle version en préparation</div>
            </div>
          </div>

          <div class="status-pill">
            <span class="status-dot" aria-hidden="true"></span>
            <span>Site en production</span>
          </div>
        </header>

        <div class="title-block">
          <div class="badge">
            <span class="badge-dot" aria-hidden="true"></span>
            <span>Nous optimisons l’expérience</span>
          </div>

          <h1 class="title">Le site est actuellement en production.</h1>
          <p class="subtitle">
            Nous finalisons une version optimisée pour garantir
            <strong>performance</strong>, <strong>stabilité</strong> et
            <strong>sécurité</strong>. Merci pour votre patience.
          </p>
        </div>

        <div class="meta">
          <div class="meta-row">
            <div class="meta-label">Statut</div>
            <div class="meta-value">Mise en ligne en préparation</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">Accès</div>
            <div class="meta-value">Temporairement indisponible</div>
          </div>

          <p class="meta-contact">
            Pour toute demande urgente, vous pouvez nous contacter à
            <a href="mailto:contact@votre-domaine.com">contact@votre-domaine.com</a>.
          </p>
        </div>

        <footer class="footer">
          <span>Version de pré-production</span>
          <span class="chip">Bientôt disponible</span>
        </footer>
      </section>
    </main>
  </body>
</html>