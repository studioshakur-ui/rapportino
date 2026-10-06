import type { CertifiedResolution, ResolutionEvidence } from "./targhetti.resolution";

export interface SourceBox { x: number; y: number; width: number; height: number }
export interface DiagramText extends SourceBox { text: string }
export interface DiagramPage {
  number: number; width: number; height: number; text: string;
  annex: string | null; revision: string | null; title: string;
  words: DiagramText[]; equipmentCodes: string[]; cableMarks: string[];
}
export interface PositionEvidence {
  position: string; page: number; box: SourceBox; method: string;
}
export interface TarghettiEndpoint {
  id: string; equipmentCode: string; description: string; local: string;
  cableMark: string; cableType: string; otherEquipmentCode: string; otherLocal: string;
  side: "partenza" | "arrivo"; sourceRow: number; sourceSheet: string;
  details: Record<string, string | number | boolean | null>;
  candidates: PositionEvidence[];
}
export interface SourceFile { name: string; sha256: string; size: number }
export interface TarghettiCatalogue {
  schema: "core.targhetti.v1"; id: string; createdAt: string;
  excel: SourceFile; pdf: SourceFile;
  pages: DiagramPage[]; endpoints: TarghettiEndpoint[];
  issues: string[];
}
export interface TarghettiImportPayload {
  catalogueId: string; cataloguePath: string; pdfPath: string; excelPath: string;
  pdfName: string; excelName: string; endpointCount: number; pageCount: number;
}
export interface PositionChange { endpointId: string; position: string; page: number | null }
export interface TarghettiEvent {
  id: string; event_type: string; validation_status: string; created_at: string;
  validated_at: string | null; validated_by: string | null;
  payload: unknown;
}
export interface EndpointState extends TarghettiEndpoint {
  confirmedPosition: string | null; confirmedPage: number | null;
  printedMetal: boolean; printedInternal: boolean;
  internalDirect?: boolean;
  decisionMode?: "automatic" | "owner" | "unresolved";
  explicitSourceTBD?: boolean;
  resolutionStatus?: CertifiedResolution["status"];
  resolutionEvidence?: ResolutionEvidence[];
}
export type LabelKind = "metal" | "internal" | "both";
export interface ManualConnection {
  cableMark: string; cableType: string; page: number;
  fromCode: string; toCode: string; fromLocal: string; toLocal: string;
  fromPosition: string; toPosition: string;
}
