export default function LoadingScreen({ message = 'Caricamento...' }) {
  const handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        // On efface tout ce qui bloque : session Supabase + crew_role + rapportini locaux
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (e) {
      console.error('Erreur pendant la réinitialisation locale:', e);
    } finally {
      // On recharge la page depuis la racine
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 gap-4 px-4">
      <p className="text-lg font-medium">{message}</p>
      <button
        type="button"
        onClick={handleReset}
        className="px-4 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-700"
      >
        Réinitialiser la session
      </button>
      <p className="text-xs text-slate-400 max-w-sm text-center">
        Si vous restez bloqué sur cet écran, ce bouton efface la session CORE et les
        données locales (crew_role et rapportini) sur ce navigateur, puis recharge
        l&apos;application.
      </p>
    </div>
  );
}
