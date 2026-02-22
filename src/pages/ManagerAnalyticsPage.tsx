// src/pages/ManagerAnalyticsPage.tsx
export default function ManagerAnalyticsPage(): JSX.Element {
  return (
    <div className="p-4">
      <div className="rounded-2xl theme-panel p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] theme-text-muted">MANAGER · ANALYTICS</div>
        <div className="mt-2 text-lg font-semibold theme-text">Analytics</div>
        <div className="mt-2 text-sm theme-text-muted">
          Modulo analytics non configurato in questo progetto. Definisci il dataset o la pagina di riferimento.
        </div>
      </div>
    </div>
  );
}
