// src/modules/command-center/QuickAddEvent.tsx
// Saisie manuelle d'un événement câble. Auto-validé (saisie fiable de Hamidou)
// -> passe par le bus -> promu en cable_events (+ priorité si bloquant).
import { useState } from "react";
import { Card, useSurface } from "../_ui/kit";
import { useEventMutations } from "../../core/events/useEvents";
import type { CableEventType } from "../../core/db/types";

const KINDS: Array<{ id: CableEventType; label: string }> = [
  { id: "posa", label: "Posa" },
  { id: "ripresa", label: "Ripresa" },
  { id: "blocco", label: "Blocco" },
  { id: "anomalia", label: "Anomalia" },
];

export default function QuickAddEvent(): JSX.Element {
  const { input, btn, btnPrimary, subtle } = useSurface();
  const { create } = useEventMutations();
  const [kind, setKind] = useState<CableEventType>("posa");
  const [code, setCode] = useState("");
  const [meters, setMeters] = useState("");
  const [zone, setZone] = useState("");

  const reset = () => {
    setCode("");
    setMeters("");
    setZone("");
  };

  const submit = () => {
    if (!code.trim()) return;
    const m = meters.trim() ? Number(meters.replace(",", ".")) : null;
    create.mutate(
      {
        source: "manual",
        event_type: kind,
        autoValidate: true,
        payload: {
          kind,
          cavo_code: code.trim(),
          meters: Number.isFinite(m as number) ? m : null,
          zone: zone.trim() || null,
        },
      },
      { onSuccess: reset }
    );
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Saisie rapide</span>
        <span className={`text-xs ${subtle}`}>auto-validé · cockpit</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`${btn} ${kind === k.id ? "ring-2 ring-sky-500" : ""}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input
          className={input}
          placeholder="Câble (marca / codice)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className={input}
          placeholder="Mètres"
          inputMode="decimal"
          value={meters}
          onChange={(e) => setMeters(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <input
          className={input}
          placeholder="Zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          className={btnPrimary}
          disabled={create.isPending || !code.trim()}
          onClick={submit}
        >
          {create.isPending ? "…" : "Ajouter"}
        </button>
      </div>
    </Card>
  );
}
