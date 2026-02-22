// src/admin/users/components/PasswordBanner.tsx

import { useCallback, useState } from "react";
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
    <div className="rounded-2xl p-4 badge-warning theme-shadow-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="kicker">Password test</div>
          <div className="mt-1 text-[14px] font-semibold theme-text">Da comunicare all’utente</div>
          {email ? <div className="mt-1 text-[12px] theme-text-muted truncate">Email: {email}</div> : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={cn("rounded-full border px-3 py-1.5 text-[12px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}
          >
            Chiudi
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2 text-[13px] theme-text">{password}</code>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "rounded-xl border px-3 py-2 text-[12px] font-semibold",
            copied ? "badge-success" : "theme-panel-2 theme-border hover:opacity-95"
          )}
        >
          {copied ? "COPIATO" : "COPY"}
        </button>
      </div>
    </div>
  );
}
