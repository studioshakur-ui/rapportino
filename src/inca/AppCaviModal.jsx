// src/inca/AppCaviModal.jsx
import React, { useEffect, useMemo } from "react";

const SITU_ORDER = ["T", "P", "R", "B", "E", "NP"];
const SITU_LABEL = { T:"Tagliato", P:"Posato", R:"Rimosso", B:"Bloccato", E:"Eliminato", NP:"Non posato" };

const color = (s) =>
  ({P:"#10b981",T:"#38bdf8",R:"#f97316",B:"#ef4444",E:"#facc15"}[s]||"#a855f7");

export default function AppCaviModal({ open, onClose, app, role, cavi }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e)=>e.key==="Escape"&&onClose?.();
    window.addEventListener("keydown", onKey);
    const prev=document.body.style.overflow; document.body.style.overflow="hidden";
    return ()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=prev;};
  },[open,onClose]);

  const list = useMemo(()=>{
    const rows = Array.isArray(cavi)?cavi:[];
    return rows.filter(r=> role==="ARRIVO" ? r.apparato_a===app : r.apparato_da===app);
  },[cavi,app,role]);

  const counts = useMemo(()=>{
    const m={T:0,P:0,R:0,B:0,E:0,NP:0};
    list.forEach(r=>{m[r.situazione||"NP"]++;});
    return m;
  },[list]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-md" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}>
      <div className="absolute inset-0 p-3 flex items-center justify-center">
        <div className="w-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-950/90 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between">
            <div>
              <div className="text-[11px] text-slate-500">APP · {role}</div>
              <div className="text-xl text-slate-50">{app}</div>
              <div className="text-xs text-slate-400">Cavi: {list.length}</div>
            </div>
            <button onClick={onClose} className="px-3 h-9 rounded-xl border border-slate-700 text-slate-200">Chiudi</button>
          </div>

          <div className="px-4 py-2 border-b border-slate-800 flex gap-2 flex-wrap text-[11px]">
            {SITU_ORDER.map(k=>(
              <span key={k} className="px-2 py-1 rounded-xl border border-slate-800 bg-slate-900/40">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:color(k)}} />
                {k}: <b>{counts[k]}</b>
              </span>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 text-slate-400 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Codice</th>
                  <th className="px-3 py-2 text-left">Da → A</th>
                  <th className="px-3 py-2 text-left">Situaz.</th>
                  <th className="px-3 py-2 text-right">m teo</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r=>(
                  <tr key={r.id||r.codice} className="border-b border-slate-900/80">
                    <td className="px-3 py-2 text-slate-100 font-mono">{r.codice}</td>
                    <td className="px-3 py-2 text-slate-400">{r.apparato_da} → {r.apparato_a}</td>
                    <td className="px-3 py-2 text-slate-200">{r.situazione||"NP"}</td>
                    <td className="px-3 py-2 text-right text-slate-200">{r.metri_teo??"—"}</td>
                  </tr>
                ))}
                {list.length===0&&(
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Nessun cavo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
