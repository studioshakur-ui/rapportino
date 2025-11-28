// src/components/RapportinoPage.jsx
import { useAuth } from "../auth/AuthProvider";
import RapportinoSheet from "./RapportinoSheet";

const CREW_LABELS = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

export default function RapportinoPage({
  crewRole,
  onChangeCrewRole,
  onLogout,
}) {
  const { profile } = useAuth();

  const displayName =
    (profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Utente").toUpperCase();

  const appRoleLabel = profile?.app_role || "CAPO";
  const crewLabel = CREW_LABELS[crewRole] || crewRole;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* NAVBAR — non stampata grazie alla classe no-print */}
      <header className="no-print bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">{displayName}</div>
          <div className="text-xs text-slate-300">
            Ruolo applicativo:{" "}
            <span className="font-medium">{appRoleLabel}</span>
          </div>
          <div className="text-xs text-slate-300">
            Tipo squadra: <span className="font-medium">{crewLabel}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onChangeCrewRole}
            className="px-3 py-1.5 text-xs rounded border border-slate-500 hover:bg-slate-800"
          >
            Cambia squadra
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* CONTENUTO — questa parte viene stampata */}
      <main className="flex-1 p-4 flex justify-center items-start">
        <div className="w-full max-w-5xl">
          {/* On passe profile au Rapportino, pour capo_id + Capo Squadra auto */}
          <RapportinoSheet crewRole={crewRole} profile={profile} />
        </div>
      </main>
    </div>
  );
}
