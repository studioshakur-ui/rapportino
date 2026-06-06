export interface NavemasterImportMeta {
  shipId: string;
  fileName: string;
  importedAt: string;
  sourceSha256: string;
  sheetName: "INCA";
  headerRowIndex: 5;
  dataStartRowIndex: 6;
  totalRows: number;
  costr: string | null;
  commessa: string | null;
  title: string | null;
}

export interface NavemasterParsedRow {
  rowIndex: number;
  values: Record<string, unknown>;
}

export interface NavemasterWorkbookParseResult {
  meta: NavemasterImportMeta;
  headers: string[];
  rows: NavemasterParsedRow[];
  isPreview: boolean;
}

export interface NavemasterParseProgress {
  phase: "reading" | "scanning" | "done";
  processedRows: number;
  totalRows: number;
  percent: number;
}

export interface NavemasterParseOptions {
  maxRows?: number;
  onProgress?: (progress: NavemasterParseProgress) => void;
}

export interface NavemasterNormalizedRow {
  marcacavo: string;
  ex_marca_cavo: string | null;
  livello: string | null;
  tipologia: string | null;
  impianto: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione: string | null;
  stato_cavo: string | null;
  situazione_cavo_conit: string | null;
  sezione: string | null;
  payload: Record<string, unknown>;
}

export type NavemasterDiffKind =
  | "NEW_CABLE"
  | "REMOVED_CABLE"
  | "STATUS_CHANGED"
  | "METERS_CHANGED"
  | "PERIMETER_CHANGED"
  | "ENDPOINT_CHANGED"
  | "NOTE_CHANGED";

export interface NavemasterDiffRow {
  marcacavo: string;
  kind: NavemasterDiffKind;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface NavemasterAiInsight {
  marcacavo: string;
  aiNavStatus: string;
  aiRiskScore: number;
  aiRiskReasons: string[];
  aiNextAction: string | null;
  aiConfidence: number;
  aiSummary: string;
}

export interface NavemasterAiOverview {
  totalCables: number;
  blockedOrProblematic: number;
  withPriorityNotes: number;
  withoutStockSignal: number;
  topPerimeters: Array<{ name: string; count: number }>;
  insights: NavemasterAiInsight[];
  summary: string[];
}

export interface NavemasterImportWriteResult {
  status: "created" | "skipped";
  importId: string;
  previousImportId: string | null;
  rowCount: number;
  reason?: string;
}
