// src/features/inca/incaImportDraft.ts

export type IncaImportModeUI = "COMMIT" | "ENRICH_TIPO";

export type IncaImportDraftV1 = {
  v: 1;
  open: boolean;
  updatedAt: number;

  // form
  costr: string;
  commessa: string;
  projectCode: string;
  note: string;

  modeUI: IncaImportModeUI;
  targetIncaFileId: string;

  // UX: iOS file picker can kill the webview; if true we show a resume banner
  needsReselectFile: boolean;
};

const KEY = "core.ufficio.inca.importDraft.v1";

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function readIncaImportDraft(): IncaImportDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = safeParse(raw) as Partial<IncaImportDraftV1> | null;
    if (!v || v.v !== 1) return null;

    return {
      v: 1,
      open: !!v.open,
      updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : Date.now(),
      costr: String(v.costr ?? ""),
      commessa: String(v.commessa ?? ""),
      projectCode: String(v.projectCode ?? ""),
      note: String(v.note ?? ""),
      modeUI: (v.modeUI === "ENRICH_TIPO" ? "ENRICH_TIPO" : "COMMIT") as IncaImportModeUI,
      targetIncaFileId: String(v.targetIncaFileId ?? ""),
      needsReselectFile: !!v.needsReselectFile,
    };
  } catch {
    return null;
  }
}

export function writeIncaImportDraft(next: IncaImportDraftV1): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors (Safari private mode, quotas, etc.)
  }
}

export function clearIncaImportDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
