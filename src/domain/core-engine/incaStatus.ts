export type IncaRawStatus = "M" | "T" | "P" | "1" | "2" | "C" | "B" | null | undefined | string;

export type IncaWorkStatus =
  | "DA_VERIFICARE"
  | "MISURATO"
  | "TAGLIATO"
  | "POSATO"
  | "PARZIALMENTE_COLLEGATO"
  | "COLLEGATO"
  | "BLOCCATO"
  | "SCONOSCIUTO";

export type IncaStatusInfo = {
  raw: string | null;
  status: IncaWorkStatus;
  label: string;
  description: string;
  isBlocked: boolean;
  isStarted: boolean;
  isVerified: boolean;
  isClosed: boolean;
  isPartiallyConnected: boolean;
  sortWeight: number;
};

type IncaStatusConfig = Omit<IncaStatusInfo, "raw">;

const UNDEFINED_STATUS: IncaStatusConfig = {
  status: "DA_VERIFICARE",
  label: "Da verificare",
  description: "Stato INCA mancante",
  isBlocked: false,
  isStarted: false,
  isVerified: false,
  isClosed: false,
  isPartiallyConnected: false,
  sortWeight: 0,
};

const UNKNOWN_STATUS: IncaStatusConfig = {
  status: "SCONOSCIUTO",
  label: "Sconosciuto",
  description: "Stato INCA non riconosciuto",
  isBlocked: false,
  isStarted: false,
  isVerified: false,
  isClosed: false,
  isPartiallyConnected: false,
  sortWeight: 5,
};

const STATUS_BY_CODE: Record<string, IncaStatusConfig> = {
  M: {
    status: "MISURATO",
    label: "Misurato",
    description: "Cavo misurato",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: false,
    isPartiallyConnected: false,
    sortWeight: 10,
  },
  T: {
    status: "TAGLIATO",
    label: "Tagliato",
    description: "Cavo tagliato/preparato",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: false,
    isPartiallyConnected: false,
    sortWeight: 20,
  },
  P: {
    status: "POSATO",
    label: "Posato",
    description: "Cavo posato, non necessariamente collegato",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: false,
    isPartiallyConnected: false,
    sortWeight: 30,
  },
  "1": {
    status: "PARZIALMENTE_COLLEGATO",
    label: "Collegato arrivo",
    description: "Cavo collegato lato arrivo",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: false,
    isPartiallyConnected: true,
    sortWeight: 40,
  },
  "2": {
    status: "PARZIALMENTE_COLLEGATO",
    label: "Collegato partenza",
    description: "Cavo collegato lato partenza",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: false,
    isPartiallyConnected: true,
    sortWeight: 40,
  },
  C: {
    status: "COLLEGATO",
    label: "Collegato",
    description: "Cavo collegato su entrambi i lati",
    isBlocked: false,
    isStarted: true,
    isVerified: true,
    isClosed: true,
    isPartiallyConnected: false,
    sortWeight: 50,
  },
  B: {
    status: "BLOCCATO",
    label: "Bloccato",
    description: "Cavo bloccato",
    isBlocked: true,
    isStarted: true,
    isVerified: false,
    isClosed: false,
    isPartiallyConnected: false,
    sortWeight: 90,
  },
};

function normalizeRawInput(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "number" ? String(raw) : String(raw);
  const normalized = value.trim().toUpperCase();
  return normalized ? normalized : null;
}

function resolveStatus(raw: unknown): IncaStatusConfig & { raw: string | null } {
  const normalized = normalizeRawInput(raw);
  if (!normalized) return { ...UNDEFINED_STATUS, raw: null };
  const config = STATUS_BY_CODE[normalized];
  return config ? { ...config, raw: normalized } : { ...UNKNOWN_STATUS, raw: normalized };
}

export function translateIncaStatus(raw: unknown): IncaStatusInfo {
  return resolveStatus(raw);
}

export function isIncaBlocked(raw: unknown): boolean {
  return translateIncaStatus(raw).isBlocked;
}

export function isIncaClosed(raw: unknown): boolean {
  return translateIncaStatus(raw).isClosed;
}

export function isIncaVerified(raw: unknown): boolean {
  return translateIncaStatus(raw).isVerified;
}

export function getIncaStatusLabel(raw: unknown): string {
  return translateIncaStatus(raw).label;
}
