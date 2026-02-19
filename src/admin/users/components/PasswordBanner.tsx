// src/admin/users/components/PasswordBanner.tsx

import React, { useCallback, useState } from "react";
import { cn } from "./ui";

export default function PasswordBanner(props: { password: string; email?: string | null; onDismiss?: () => void }) {
  const { password, email, onDismiss } = props;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [password]);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.26em] text-amber-200/80">Password test</div>
          <div className="mt-1 text-[14px] font-semibold text-slate-50">Da comunicare all’utente</div>
          {email ? <div className="mt-1 text-[12px] text-slate-200/80 truncate">Email: {email}</div> : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold", "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40")}
          >
            Chiudi
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[13px] text-slate-50">{password}</code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "rounded-xl border px-3 py-2 text-[12px] font-semibold",
            copied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
          )}
        >
          {copied ? "COPIATO" : "COPY"}
        </button>
      </div>
    </div>
  );
}