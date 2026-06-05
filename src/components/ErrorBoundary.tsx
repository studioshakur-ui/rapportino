// src/components/ErrorBoundary.tsx
// Garde-fou racine : transforme tout crash de rendu en message lisible
// plutôt qu'un écran blanc (white screen of death).
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Visible dans la console prod pour diagnostic.
    console.error("CORE COMMAND crashed:", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 space-y-3 text-center">
          <p className="text-3xl" aria-hidden>⚠️</p>
          <h1 className="text-lg font-bold">Une erreur est survenue</h1>
          <p className="text-sm text-zinc-500 break-words">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 active:scale-[0.98] transition"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }
}
