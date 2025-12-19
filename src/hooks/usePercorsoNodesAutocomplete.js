// src/inca/hooks/usePercorsoNodesAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function normNode(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/**
 * Autocomplete sur les noeuds de percorso.
 * Source: view public.inca_percorsi_nodes_v1 (nodo, occorrenze)
 */
export function usePercorsoNodesAutocomplete({
  prefix,
  limit = 12,
  debounceMs = 180,
  enabled = true,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lastReqId = useRef(0);

  const normalizedPrefix = useMemo(() => {
    const p = normNode(prefix);
    return p;
  }, [prefix]);

  useEffect(() => {
    let alive = true;
    if (!enabled) {
      setOptions([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    const p = normalizedPrefix;
    if (!p || p.length < 1) {
      setOptions([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    const reqId = ++lastReqId.current;

    setLoading(true);
    setError(null);

    const t = setTimeout(async () => {
      try {
        const { data, error: e } = await supabase
          .from("inca_percorsi_nodes_v1")
          .select("nodo,occorrenze")
          .ilike("nodo", `${p}%`)
          .order("occorrenze", { ascending: false })
          .order("nodo", { ascending: true })
          .limit(limit);

        if (e) throw e;
        if (!alive || reqId !== lastReqId.current) return;

        const list = Array.isArray(data) ? data : [];
        setOptions(
          list
            .map((r) => ({ nodo: normNode(r?.nodo), occorrenze: Number(r?.occorrenze || 0) }))
            .filter((r) => r.nodo)
        );
      } catch (err) {
        if (!alive || reqId !== lastReqId.current) return;
        console.error("[usePercorsoNodesAutocomplete] error:", err);
        setOptions([]);
        setError("Autocomplete non disponibile.");
      } finally {
        if (!alive || reqId !== lastReqId.current) return;
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [normalizedPrefix, limit, debounceMs, enabled]);

  return { options, loading, error };
}

export default usePercorsoNodesAutocomplete;
