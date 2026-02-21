// src/pages/AuthConfirmPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Status = "loading" | "success" | "expired" | "invalid" | "error";

function parseHashTokens() {
  const raw = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : window.location.hash || "";
  const params = new URLSearchParams(raw);

  // Supabase uses hash for implicit grant style tokens on redirects.
  const access_token = params.get("access_token") || "";
  const refresh_token = params.get("refresh_token") || "";
  const token_type = params.get("token_type") || "";

  // When errors happen, Supabase may send them either in query or hash depending on template/flow.
  const error = params.get("error") || "";
  const error_code = params.get("error_code") || "";
  const error_description = params.get("error_description") || "";

  return { access_token, refresh_token, token_type, error, error_code, error_description };
}

function parseQueryErrors() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get("error") || "";
  const error_code = url.searchParams.get("error_code") || "";
  const error_description = url.searchParams.get("error_description") || "";
  return { error, error_code, error_description };
}

function cleanUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  // keep path + query (we don't want to drop useful error query; but we *do* want to remove tokens)
  // We can safely remove error params after we rendered status.
  window.history.replaceState({}, document.title, url.toString());
}

function stripErrorQueryParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  window.history.replaceState({}, document.title, url.toString());
}

function decodeMaybe(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function AuthConfirmPage(): JSX.Element {
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [details, setDetails] = useState<string>("");

  const hashTokens = useMemo(() => parseHashTokens(), []);
  const queryErr = useMemo(() => parseQueryErrors(), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 0) If Supabase returned an error via query params (common for otp_expired)
        if (queryErr.error || queryErr.error_code) {
          const code = (queryErr.error_code || queryErr.error || "").toLowerCase();
          const desc = decodeMaybe(queryErr.error_description || queryErr.error || queryErr.error_code || "");
          if (!cancelled) {
            if (code.includes("otp_expired") || desc.toLowerCase().includes("expired")) {
              setStatus("expired");
              setDetails(desc || "Email link expired. Ask Admin to resend the invite.");
            } else {
              setStatus("invalid");
              setDetails(desc || "Invalid email link.");
            }
            // Clean tokens/hash (if any) and remove error params for a clean UI url
            cleanUrl();
            stripErrorQueryParams();
          }
          return;
        }

        // 1) If the hash includes an error
        if (hashTokens.error || hashTokens.error_code) {
          const code = (hashTokens.error_code || hashTokens.error || "").toLowerCase();
          const desc = decodeMaybe(hashTokens.error_description || hashTokens.error || hashTokens.error_code || "");
          if (!cancelled) {
            if (code.includes("otp_expired") || desc.toLowerCase().includes("expired")) {
              setStatus("expired");
              setDetails(desc || "Email link expired. Ask Admin to resend the invite.");
            } else {
              setStatus("invalid");
              setDetails(desc || "Invalid email link.");
            }
            cleanUrl();
          }
          return;
        }

        // 2) If no tokens, user opened manually or redirect misconfigured
        if (!hashTokens.access_token || !hashTokens.refresh_token) {
          if (!cancelled) {
            setStatus("invalid");
            setDetails("Missing confirmation tokens. Use the link from your email (Accept invite).");
          }
          return;
        }

        // 3) Your app uses detectSessionInUrl=false, so we must set session explicitly
        const { error: setErr } = await supabase.auth.setSession({
          access_token: hashTokens.access_token,
          refresh_token: hashTokens.refresh_token,
        });

        if (setErr) {
          const msg = setErr.message || "Unable to set session from confirmation tokens.";
          if (!cancelled) {
            const lower = msg.toLowerCase();
            if (lower.includes("expired") || lower.includes("otp")) {
              setStatus("expired");
            } else {
              setStatus("error");
            }
            setDetails(msg);
            cleanUrl();
          }
          return;
        }

        // 4) Verify user
        const { data, error: userErr } = await supabase.auth.getUser();
        if (userErr || !data?.user) {
          const msg = userErr?.message || "Unable to load user after confirmation.";
          if (!cancelled) {
            setStatus("error");
            setDetails(msg);
            cleanUrl();
          }
          return;
        }

        if (!cancelled) {
          setStatus("success");
          setDetails(data.user.email || "");
          cleanUrl();
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setDetails(String(e));
          cleanUrl();
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hashTokens, queryErr]);

  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      style={{
        width: "min(760px, 100%)",
        borderRadius: 18,
        padding: 28,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(10,14,24,.55)",
        boxShadow: "0 20px 80px rgba(0,0,0,.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </div>
  );

  const Button: React.FC<{ onClick: () => void; variant?: "primary" | "ghost"; children: React.ReactNode }> = ({
    onClick,
    variant = "primary",
    children,
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: variant === "ghost" ? "1px solid rgba(255,255,255,.14)" : "1px solid rgba(255,255,255,.08)",
        background: variant === "ghost" ? "transparent" : "rgba(56, 189, 248, 0.18)",
        color: "rgba(255,255,255,.92)",
        cursor: "pointer",
        fontWeight: 700,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card>
        <div style={{ fontSize: 12, letterSpacing: 2.2, opacity: 0.75 }}>CNCS • CORE</div>

        {status === "loading" && (
          <>
            <h1 style={{ marginTop: 12, fontSize: 28, marginBottom: 10 }}>Conferma in corso…</h1>
            <p style={{ opacity: 0.86, margin: 0 }}>Stiamo verificando il link di accesso.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 style={{ marginTop: 12, fontSize: 28, marginBottom: 10 }}>✅ Link confermato</h1>
            <p style={{ opacity: 0.88, margin: 0 }}>
              Accesso abilitato{details ? (
                <>
                  {" "}
                  per <strong>{details}</strong>
                </>
              ) : null}
              .
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => nav("/login")}>
                Vai al login
              </Button>
              <Button onClick={() => nav("/")}>Continua</Button>
            </div>
          </>
        )}

        {status === "expired" && (
          <>
            <h1 style={{ marginTop: 12, fontSize: 28, marginBottom: 10 }}>⏳ Link scaduto</h1>
            <p style={{ opacity: 0.88, margin: 0 }}>
              {details || "Questo link non è più valido. Chiedi all’Admin di reinviare l’invito e riprova."}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => nav("/login")}>
                Torna al login
              </Button>
            </div>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <h1 style={{ marginTop: 12, fontSize: 28, marginBottom: 10 }}>❌ Conferma non riuscita</h1>
            <p style={{ opacity: 0.88, margin: 0 }}>
              {details || "Link non valido. Usa il link ricevuto via email (Accept invite)."}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => nav("/login")}>
                Torna al login
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
