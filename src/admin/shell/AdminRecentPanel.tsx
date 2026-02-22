// src/admin/shell/AdminRecentPanel.tsx

import type { AdminRecentItem } from "../AdminConsoleContext";

export default function AdminRecentPanel({ items }: { items: AdminRecentItem[] }): JSX.Element | null {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl theme-panel">
      <div className="px-4 py-3 border-b theme-border">
        <div className="kicker">Recent changes</div>
        <div className="mt-1 text-[12px] theme-text-muted">Ultimi aggiornamenti disponibili</div>
      </div>
      <div className="divide-y theme-border">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="text-[12px] theme-text font-semibold truncate">{item.title}</div>
            {item.subtitle ? <div className="text-[11px] theme-text-muted truncate">{item.subtitle}</div> : null}
            {item.timeLabel ? <div className="mt-1 text-[11px] theme-text-muted">{item.timeLabel}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
