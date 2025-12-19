// src/inca/components/PercorsoSearchBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePercorsoNodesAutocomplete } from "../hooks/usePercorsoNodesAutocomplete";

function normNode(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function uniq(list) {
  const out = [];
  const seen = new Set();
  for (const x of list || []) {
    const v = normNode(x);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export default function PercorsoSearchBar({
  incaFileId,
  value,
  onChange,
  disabled,
  loading,
  matchCount,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const inputRef = useRef(null);
  const shellRef = useRef(null);

  const nodes = useMemo(() => uniq(value), [value]);
  const prefix = useMemo(() => normNode(input), [input]);

  const { options, loading: acLoading, error: acError } = usePercorsoNodesAutocomplete({
    prefix,
    enabled: !!incaFileId && !disabled,
    limit: 12,
    debounceMs: 180,
  });

  const dropdownOptions = useMemo(() => {
    const picked = new Set(nodes);
    return (options || []).filter((o) => o?.nodo && !picked.has(normNode(o.nodo)));
  }, [options, nodes]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const el = shellRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pushNode(raw) {
    const v = normNode(raw);
    if (!v) return;
    const next = uniq([...(nodes || []), v]);
    onChange?.(next);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }

  function removeNode(n) {
    const v = normNode(n);
    const next = uniq((nodes || []).filter((x) => normNode(x) !== v));
    onChange?.(next);
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }

  function clearAll() {
    onChange?.([]);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }

  const statusLine = useMemo(() => {
    if (!incaFileId) return "Seleziona un file INCA per attivare Percorso Search.";
    if (disabled) return "Percorso Search disabilitato.";
    if (loading) return "Ricerca percorso in corso…";
    if (nodes.length > 0) return `Match: ${matchCount ?? 0}`;
    return "Preview Percorso (CORE 1.0)";
  }, [incaFileId, disabled, loading, nodes.length, matchCount]);

  return (
    <div ref={shellRef} className="percorso-search-shell rounded-2xl overflow-hidden">
      <div className="percorso-search-signal" />

      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Percorso Search
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {statusLine}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {nodes.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-950/80"
                title="Svuota filtro percorso"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Chips */}
        {nodes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => removeNode(n)}
                className="percorso-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] text-slate-200"
                title="Rimuovi nodo"
              >
                <span className="font-semibold">{n}</span>
                <span className="text-slate-400">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Input + dropdown */}
        <div className="mt-2 relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                pushNode(input);
                setOpen(false);
              }
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Cerca nodo percorso (es: 166K191Z, 06-07 A 12…)"
            disabled={disabled || !incaFileId}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400/40"
          />

          {open && (prefix || acLoading) && (
            <div className="percorso-search-dropdown absolute z-20 mt-2 w-full rounded-2xl overflow-hidden">
              <div className="max-h-[260px] overflow-auto">
                {acLoading ? (
                  <div className="px-3 py-3 text-[12px] text-slate-400">Ricerca…</div>
                ) : dropdownOptions.length === 0 ? (
                  <div className="px-3 py-3 text-[12px] text-slate-500">
                    Nessun suggerimento.
                  </div>
                ) : (
                  dropdownOptions.map((o) => (
                    <button
                      key={o.nodo}
                      type="button"
                      className="percorso-search-item w-full text-left px-3 py-2"
                      onClick={() => {
                        pushNode(o.nodo);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] text-slate-100 font-semibold">{o.nodo}</div>
                        <div className="text-[11px] text-slate-500">{o.occorrenze}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {(acError || error) && (
                <div className="border-t border-white/10 px-3 py-2 text-[11px] text-amber-200 bg-amber-900/20">
                  {error || acError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          Tip: aggiungi più nodi → filtro AND (il cavo deve contenere tutti i nodi selezionati).
        </div>
      </div>
    </div>
  );
}
