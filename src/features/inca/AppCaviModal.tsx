// src/inca/AppCaviModal.jsx
import { useEffect, useMemo } from "react";
import type { MouseEvent } from "react";

const SITU_ORDER = ["T", "P", "R", "B", "E", "NP"] as const;

const color = (s: string) =>
  ({P:"#10b981",T:"#38bdf8",R:"#f97316",B:"#ef4444",E:"#facc15"}[s]||"#a855f7");

type IncaCavoRow = {
  id?: string | number;
  codice?: string;
  apparato_da?: string;
  apparato_a?: string;
  situazione?: string | null;
  metri_teo?: string | number | null;
};

export default function AppCaviModal({
  open,
  onClose,
  app,
  role,
  cavi,
}: {
  open: boolean;
  onClose?: () => void;
  app?: string;
  role: "ARRIVO" | "PARTENZA" | string;
  cavi?: IncaCavoRow[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent)=>e.key==="Escape"&&onClose?.();
    window.addEventListener("keydown", onKey);
    const prev=document.body.style.overflow; document.body.style.overflow="hidden";
    return ()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=prev;};
  },[open,onClose]);

  const list = useMemo(()=>{
    const rows = Array.isArray(cavi)?cavi:[];
    return rows.filter(r=> role==="ARRIVO" ? r.apparato_a===app : r.apparato_da===app);
  },[cavi,app,role]);

  const counts = useMemo(()=>{
    const m: Record<string, number> = {T:0,P:0,R:0,B:0,E:0,NP:0};
    list.forEach(r=>{m[r.situazione||"NP"]++;});
    return m;
  },[list]);

  if(!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] theme-overlay backdrop-blur-md"
      onMouseDown={(e: MouseEvent<HTMLDivElement>)=>e.target===e.currentTarget&&onClose?.()}
    >
      <div className="absolute inset-0 p-3 flex items-center justify-center">
        <div className="w-full max-w-6xl rounded-2xl theme-panel shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b theme-border flex justify-between">
            <div>
              <div className="text-[11px] theme-text-muted">APP · {role}</div>
              <div className="text-xl theme-text">{app}</div>
              <div className="text-xs theme-text-muted">Cavi: {list.length}</div>
            </div>
            <button onClick={onClose} className="btn-instrument px-3 h-9 rounded-xl">Chiudi</button>
          </div>

          <div className="px-4 py-2 border-b theme-border flex gap-2 flex-wrap text-[11px]">
            {SITU_ORDER.map(k=>(
              <span key={k} className="px-2 py-1 rounded-xl border theme-border bg-[var(--panel2)]">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:color(k)}} />
                {k}: <b>{counts[k]}</b>
              </span>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 theme-table-head text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Codice</th>
                  <th className="px-3 py-2 text-left">Da → A</th>
                  <th className="px-3 py-2 text-left">Situaz.</th>
                  <th className="px-3 py-2 text-right">m teo</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r=>(
                  <tr key={r.id||r.codice} className="border-b theme-border">
                    <td className="px-3 py-2 theme-text font-mono">{r.codice}</td>
                    <td className="px-3 py-2 theme-text-muted">{r.apparato_da} → {r.apparato_a}</td>
                    <td className="px-3 py-2 theme-text">{r.situazione||"NP"}</td>
                    <td className="px-3 py-2 text-right theme-text">{r.metri_teo??"—"}</td>
                  </tr>
                ))}
                {list.length===0&&(
                  <tr><td colSpan={4} className="px-3 py-8 text-center theme-text-muted">Nessun cavo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
