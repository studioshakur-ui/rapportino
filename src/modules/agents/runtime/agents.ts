// src/modules/agents/runtime/agents.ts
// Les 5 agents minimum de CORE COMMAND. Chacun lit l'état, produit des findings.
// Aucun agent n'écrit INCA. Les agents proposent ; Hamidou décide.
import { supabase } from "../../../core/supabase";
import { normalizeMessage } from "../../whatsapp/normalize";
import type { AgentDef, DraftFinding } from "./types";
import type {
  CoreEvent,
  WhatsappMessage,
  CableEvent,
  CablePriority,
} from "../../../core/db/types";

// 1) INTAKE AGENT — repère les messages WhatsApp non structurés qui ressemblent à des events.
const intakeAgent: AgentDef = {
  name: "intake",
  label: "Intake Agent",
  description: "Détecte les messages WhatsApp ignorés qui ressemblent à des événements.",
  run: async () => {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .is("core_event_id", null)
      .limit(500);
    if (error) throw error;
    const findings: DraftFinding[] = [];
    for (const m of (data ?? []) as WhatsappMessage[]) {
      const norm = normalizeMessage(m.raw_text);
      if (norm.confidence > 0 && norm.confidence < 0.6 && (norm.cavo_code || norm.kind)) {
        findings.push({
          agent: "intake",
          severity: "warn",
          title: `Message possiblement manqué (${Math.round(norm.confidence * 100)}%)`,
          detail: { message_id: m.id, raw_text: m.raw_text, normalized: norm },
        });
      }
    }
    return findings;
  },
};

// 2) NORMALIZER AGENT — qualité de structuration des events pending.
const normalizerAgent: AgentDef = {
  name: "normalizer",
  label: "Normalizer Agent",
  description: "Contrôle la complétude des événements WhatsApp en attente.",
  run: async () => {
    const { data, error } = await supabase
      .from("core_events")
      .select("*")
      .eq("source", "whatsapp")
      .eq("status", "pending")
      .limit(500);
    if (error) throw error;
    const findings: DraftFinding[] = [];
    for (const ev of (data ?? []) as CoreEvent[]) {
      const p = ev.payload ?? {};
      const missing: string[] = [];
      if (!p.cavo_code) missing.push("cavo_code");
      if (p.meters == null && ev.event_type === "posa") missing.push("meters");
      if (missing.length > 0) {
        findings.push({
          agent: "normalizer",
          severity: "info",
          title: `Événement incomplet : ${missing.join(", ")}`,
          detail: { payload: p },
          related_event: ev.id,
        });
      }
    }
    return findings;
  },
};

// 3) INCA MATCHER AGENT — vérifie que les codes câbles existent dans INCA (lecture seule).
const incaMatcherAgent: AgentDef = {
  name: "inca_matcher",
  label: "INCA Matcher Agent",
  description: "Vérifie que les câbles cités existent dans INCA (sans modifier INCA).",
  run: async () => {
    const { data, error } = await supabase
      .from("core_events")
      .select("*")
      .eq("status", "pending")
      .limit(500);
    if (error) throw error;
    const events = (data ?? []) as CoreEvent[];
    const findings: DraftFinding[] = [];
    for (const ev of events) {
      const code = (ev.payload?.cavo_code ?? ev.payload?.marca_cavo) as string | undefined;
      if (!code) continue;
      const { count, error: cErr } = await supabase
        .from("inca_cavi")
        .select("*", { count: "exact", head: true })
        .or(`marca_cavo.eq.${code},codice.eq.${code}`);
      if (cErr) continue;
      if ((count ?? 0) === 0) {
        findings.push({
          agent: "inca_matcher",
          severity: "warn",
          title: `Câble "${code}" introuvable dans INCA`,
          detail: { cavo_code: code },
          related_event: ev.id,
        });
      }
    }
    return findings;
  },
};

// 4) PRODUCTION AGENT — recalcule le KPI du jour et signale les écarts à l'objectif.
const productionAgent: AgentDef = {
  name: "production",
  label: "Production Agent",
  description: "Recalcule la production du jour (KPI) et signale les écarts à l'objectif.",
  run: async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = start.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("cable_events")
      .select("*")
      .gte("occurred_at", start.toISOString());
    if (error) throw error;
    const rows = (data ?? []) as CableEvent[];
    const posa = rows.filter((e) => e.event_type === "posa");
    const cablesPosed = new Set(posa.map((e) => e.cavo_code).filter(Boolean)).size;
    const metersPosed = posa.reduce((s, e) => s + (e.meters ?? 0), 0);
    const activeOperators = new Set(rows.map((e) => e.operator_id).filter(Boolean)).size;

    const { data: existing } = await supabase
      .from("production_daily_kpis")
      .select("*")
      .eq("day", day)
      .maybeSingle();
    const target = (existing as { meters_target?: number | null } | null)?.meters_target ?? null;

    await supabase.from("production_daily_kpis").upsert(
      {
        day,
        cables_posed: cablesPosed,
        meters_posed: metersPosed,
        active_operators: activeOperators,
        meters_target: target,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "day" }
    );

    const findings: DraftFinding[] = [];
    if (target != null && target > 0 && metersPosed < target * 0.6) {
      findings.push({
        agent: "production",
        severity: "warn",
        title: `Production sous l'objectif : ${Math.round(metersPosed)}/${target} m`,
        detail: { day, metersPosed, target, cablesPosed, activeOperators },
      });
    }
    return findings;
  },
};

// 5) AUDITOR AGENT — qualité des données / cohérence.
const auditorAgent: AgentDef = {
  name: "auditor",
  label: "Auditor Agent",
  description: "Audite la cohérence : doublons de priorités, events validés incomplets.",
  run: async () => {
    const findings: DraftFinding[] = [];

    // doublons de priorités ouvertes sur un même câble
    const { data: prios } = await supabase
      .from("cable_priorities")
      .select("*")
      .eq("status", "open");
    const seen = new Map<string, number>();
    for (const p of (prios ?? []) as CablePriority[]) {
      seen.set(p.cavo_code, (seen.get(p.cavo_code) ?? 0) + 1);
    }
    for (const [code, n] of seen) {
      if (n > 1) {
        findings.push({
          agent: "auditor",
          severity: "info",
          title: `Câble "${code}" a ${n} priorités ouvertes (doublon ?)`,
          detail: { cavo_code: code, count: n },
        });
      }
    }

    // events validés sans cavo_code
    const { data: validated } = await supabase
      .from("core_events")
      .select("*")
      .eq("status", "validated")
      .limit(500);
    for (const ev of (validated ?? []) as CoreEvent[]) {
      const code = ev.payload?.cavo_code ?? ev.payload?.marca_cavo;
      if (!code) {
        findings.push({
          agent: "auditor",
          severity: "info",
          title: "Événement validé sans code câble",
          detail: { event_type: ev.event_type },
          related_event: ev.id,
        });
      }
    }
    return findings;
  },
};

export const AGENTS: AgentDef[] = [
  intakeAgent,
  normalizerAgent,
  incaMatcherAgent,
  productionAgent,
  auditorAgent,
];
