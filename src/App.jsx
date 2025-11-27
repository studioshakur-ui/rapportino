import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import LoadingScreen from "./components/LoadingScreen";
import Login from "./pages/Login";
import RoleSelect from "./components/RoleSelect";
import RapportinoPage from "./components/RapportinoPage";

// Crew roles per Rapportino (tipo squadra)
const CREW_VALUES = ["ELETTRICISTA", "CARPENTERIA", "MONTAGGIO"];

/**
 * EXPORT per compatibilità con ArchivioModal.jsx
 * (anche se non usiamo ancora l’archivio nel flusso principale).
 */
export const ROLE_OPTIONS = [
  { value: "CAPO", label: "Capo" },
  { value: "UFFICIO", label: "Ufficio" },
  { value: "DIREZIONE", label: "Direzione" },
];

export const STATUS_LABELS = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  ARCHIVED: "Archiviato",
};

function CoreApp() {
  const { session, profile, loading, error, signOut } = useAuth();
  const [crewRole, setCrewRole] = useState(null);

  // Legge la squadra da localStorage all’avvio
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("core_crew_role");
      if (CREW_VALUES.includes(stored)) {
        setCrewRole(stored);
      }
    } catch (e) {
      console.error("Errore lettura core_crew_role:", e);
    }
  }, []);

  const handleSelectCrewRole = (role) => {
    setCrewRole(role);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("core_crew_role", role);
      } catch (e) {
        console.error("Errore scrittura core_crew_role:", e);
      }
    }
  };

  const handleChangeCrewRole = () => {
    setCrewRole(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("core_crew_role");
      } catch (e) {
        console.error("Errore rimozione core_crew_role:", e);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    handleChangeCrewRole();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Login globalError={error} />;
  }

  if (!profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  if (!crewRole) {
    return <RoleSelect onSelect={handleSelectCrewRole} />;
  }

  return (
    <RapportinoPage
      crewRole={crewRole}
      onChangeCrewRole={handleChangeCrewRole}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CoreApp />
    </AuthProvider>
  );
}
