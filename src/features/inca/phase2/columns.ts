import { IncaColumn } from "./types";

export const defaultColumns: IncaColumn[] = [
  { key: "codice", label: "Codice", group: "Identity", visible: true, pinned: true },
  { key: "situazione", label: "Sit.", group: "Status", visible: true, pinned: true },
  { key: "progress_percent", label: "Prog.", group: "Status", visible: true },
  { key: "apparato_da", label: "App. DA", group: "Endpoints", visible: true },
  { key: "apparato_a", label: "App. A", group: "Endpoints", visible: true },
  { key: "data_posa", label: "Data posa", group: "Execution", visible: true },
  { key: "capo_label", label: "Capo", group: "Execution", visible: true },
];