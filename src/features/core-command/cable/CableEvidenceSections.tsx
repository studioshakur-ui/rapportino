import { Pill } from "../../../components/command-ui";
import {
  buildHighlightedText,
  type CableEvidenceMatch,
} from "../../../core/cable/cableEvidence";

export type CableEvidenceItem = {
  id: string;
  occurred_at: string;
  event_kind: string;
  source: "cable_event" | "core_event";
  note: string | null;
  match: CableEvidenceMatch;
  is_manual_validation: boolean;
};

const KIND_META: Record<string, { label: string; tone: string; dot: string }> = {
  CABLE_POSATO: {
    label: "Cavo posato",
    tone: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  CABLE_MENTION: {
    label: "Nota campo",
    tone: "text-stone-500",
    dot: "bg-stone-400",
  },
  CABLE_SFILATO: {
    label: "Cavo sfilato",
    tone: "text-sky-600",
    dot: "bg-sky-500",
  },
  CABLE_CORTO: {
    label: "Cavo corto",
    tone: "text-amber-700",
    dot: "bg-amber-500",
  },
  CABLE_MANCANTE: {
    label: "Cavo mancante",
    tone: "text-red-700",
    dot: "bg-red-500",
  },
  CABLE_DA_CONTROLLARE: {
    label: "Da verificare",
    tone: "text-amber-700",
    dot: "bg-amber-400",
  },
  GENERAL_MESSAGE: {
    label: "Segnale campo",
    tone: "text-stone-500",
    dot: "bg-stone-400",
  },
  posa: {
    label: "Cavo posato",
    tone: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  ripresa: { label: "Ripresa", tone: "text-sky-600", dot: "bg-sky-500" },
  blocco: { label: "Bloccato", tone: "text-red-700", dot: "bg-red-500" },
  anomalia: {
    label: "Anomalia",
    tone: "text-amber-700",
    dot: "bg-amber-500",
  },
};

function kindMeta(kind: string) {
  return (
    KIND_META[kind] ?? {
      label: kind.replace(/_/g, " "),
      tone: "text-stone-500",
      dot: "bg-stone-400",
    }
  );
}

function matchTypeLabel(type: CableEvidenceMatch["match_type"]): string {
  const labels: Record<CableEvidenceMatch["match_type"], string> = {
    exact: "Esatto",
    strict: "Confermato",
    loose: "Da validare",
    ocr: "OCR",
    telegram: "Telegram",
    manual: "Validazione manuale",
    ambiguous: "Ambiguo",
    none: "Nessun match",
  };
  return labels[type];
}

function EvidenceCard({ item }: { item: CableEvidenceItem }) {
  const meta = kindMeta(item.event_kind);
  const text = item.note ?? item.match.source_text_excerpt ?? "";
  const parts = buildHighlightedText(
    text,
    item.match.highlight_start,
    item.match.highlight_end,
  );
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={`text-sm font-semibold ${meta.tone}`}>
            {meta.label}
          </span>
          <Pill
            tone={
              item.match.bucket === "linked"
                ? "emerald"
                : item.match.bucket === "ambiguous"
                  ? "amber"
                  : "neutral"
            }
          >
            {matchTypeLabel(item.match.match_type)}
          </Pill>
        </div>
        <span className="text-xs text-stone-400">
          {new Date(item.occurred_at).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-stone-500">Codice rilevato</dt>
          <dd className="font-mono">{item.match.raw_detected_code ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">Codice normalizzato</dt>
          <dd className="font-mono">
            {item.match.normalized_detected_code ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">Tipo match</dt>
          <dd>{matchTypeLabel(item.match.match_type)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">Confidenza</dt>
          <dd>{Math.round(item.match.match_confidence * 100)}%</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
        Estratto
      </p>
      <div className="mt-1 rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
        {parts.map((part, index) =>
          part.highlight ? (
            <mark
              key={index}
              className="rounded bg-amber-200 px-1 font-semibold text-stone-950"
            >
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        <span className="font-semibold">Motivo:</span> {item.match.match_reason}
      </p>
    </div>
  );
}

function EvidenceList({ items }: { items: CableEvidenceItem[] }) {
  return (
    <div className="mt-3 space-y-3">
      {items.map((item) => (
        <EvidenceCard key={`${item.source}:${item.id}`} item={item} />
      ))}
    </div>
  );
}

export function CableEvidenceSections({
  linkedEvidence,
  ambiguousEvidence,
  relatedEvidence,
}: {
  linkedEvidence: CableEvidenceItem[];
  ambiguousEvidence: CableEvidenceItem[];
  relatedEvidence: CableEvidenceItem[];
}) {
  return (
    <div className="space-y-3">
      <section aria-labelledby="linked-evidence-title" className="space-y-3">
        <h2
          id="linked-evidence-title"
          className="text-xs font-semibold uppercase tracking-widest text-emerald-700"
        >
          Prove collegate — {linkedEvidence.length}
        </h2>
        {linkedEvidence.length > 0 ? (
          <EvidenceList items={linkedEvidence} />
        ) : (
          <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
            Nessuna prova confermata per questo cavo.
          </p>
        )}
      </section>

      <details className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-amber-700">
          Candidati ambigui — {ambiguousEvidence.length} · Validazione richiesta
        </summary>
        {ambiguousEvidence.length > 0 ? (
          <EvidenceList items={ambiguousEvidence} />
        ) : (
          <p className="mt-3 text-sm text-stone-500">Nessun candidato ambiguo.</p>
        )}
      </details>

      <details className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-stone-600">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-stone-500">
          Segnali correlati — {relatedEvidence.length} · Nessuna azione
        </summary>
        {relatedEvidence.length > 0 ? (
          <EvidenceList items={relatedEvidence} />
        ) : (
          <p className="mt-3 text-sm text-stone-500">Nessun segnale correlato.</p>
        )}
      </details>
    </div>
  );
}
