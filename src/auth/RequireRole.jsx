// src/auth/RequireRole.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import LoadingScreen from "../components/LoadingScreen";

/**
 * Guard routes by app_role.
 * allow: array of accepted roles, e.g. ['CAPO'] or ['UFFICIO','DIREZIONE']
 */
export default function RequireRole({ allow, children }) {
  const { session, profile, loading, authReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady || loading) return;

    // No session -> login
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    // Wait profile (RLS + query)
    if (!profile) return;

    // Role mismatch -> redirect to their home
    if (Array.isArray(allow) && allow.length > 0 && !allow.includes(profile.app_role)) {
      switch (profile.app_role) {
        case "UFFICIO":
          navigate("/ufficio", { replace: true });
          break;
        case "DIREZIONE":
          navigate("/direction", { replace: true });
          break;
        case "MANAGER":
          navigate("/manager", { replace: true });
          break;
        default:
          navigate("/app", { replace: true });
      }
    }
  }, [authReady, loading, session, profile, allow, navigate]);

  if (!authReady || loading) {
    return <LoadingScreen message="Inizializzazione sicurezza CORE…" />;
  }

  if (!session) {
    return <LoadingScreen message="Sessione non attiva… Reindirizzamento" />;
  }

  if (!profile) {
    return <LoadingScreen message="Caricamento profilo…" />;
  }

  if (Array.isArray(allow) && allow.length > 0 && !allow.includes(profile.app_role)) {
    return <LoadingScreen message="Reindirizzamento…" />;
  }

  return <>{children}</>;
}
