// src/components/LoadingScreen.jsx
import React from "react";

export default function LoadingScreen({ message = "Caricamento..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 gap-4 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">CORE</h1>
        <p className="text-lg font-medium">{message}</p>
      </div>

      <p className="text-xs text-slate-300 max-w-sm text-center">
        Inizializzazione in corso. Se resta bloccato, apri la Console e verifica
        eventuali errori Supabase (rete, env, policy RLS).
      </p>
    </div>
  );
}
