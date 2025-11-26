import React from 'react';

export default function LoadingScreen({ message = 'Caricamento...' }) {
  const handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        // On efface TOUT ce qui traîne pour ce site
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.error('Erreur pendant la réinitialisation locale:', e);
    } finally {
      if (typeof window !== 'undefined') {
        // On recharge depuis la racine du site
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">CORE</h1>
        <p className="text-lg font-medium">{message}</p>
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="px-5 py-2 text-sm rounded bg-emerald-500 hover:bg-emerald-600"
      >
        🔄 Réinitialiser la session sur ce navigateur
      </button>

      <p className="text-xs text-slate-300 max-w-sm text-center">
        Ce bouton efface la session Supabase, le tipo squadra (crew_role) et les
        rapportini stockés localement pour ce navigateur, puis recharge l&apos;app.
      </p>
    </div>
  );
}
