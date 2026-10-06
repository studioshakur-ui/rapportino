import { TarghettiError } from "./targhetti.locale";
import { labelRows, printableEndpoints } from "./targhetti.logic";
import type { EndpointState, LabelKind } from "./targhetti.types";

export function buildLabelWorkbook(rows: EndpointState[], kind: LabelKind, XLSX: typeof import("xlsx")) {
  rows = printableEndpoints(rows);
  labelRows(rows, kind); // Validate the entire selection before generating any sheet.
  const workbook = XLSX.utils.book_new();
  const groups = new Map<string, EndpointState[]>();
  for (const row of rows) groups.set(row.equipmentCode, [...(groups.get(row.equipmentCode) ?? []), row]);
  const used = new Set<string>();
  const sheetName = (name: string) => {
    const base = name.replace(/[\\/?*:[\]]/g, "_").slice(0, 27);
    let candidate = base, suffix = 1;
    while (used.has(candidate.toLowerCase())) candidate = `${base}_${suffix++}`;
    used.add(candidate.toLowerCase()); return candidate;
  };
  for (const [code, endpoints] of groups) {
    const labels = labelRows(endpoints, kind);
    for (const [suffix, values] of [["MET", labels.metal], ["INT", labels.internal]] as const) {
      if ((suffix === "MET" && kind === "internal") || (suffix === "INT" && kind === "metal")) continue;
      // No header row: every cell is a label ready for the marking printer.
      const sheet = XLSX.utils.aoa_to_sheet(values.map(value => [value]));
      sheet["!cols"] = [{ wch: 42 }];
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName(`${code}_${suffix}`));
    }
  }
  return { workbook, filename: `TARGHETTI_${groups.size === 1 ? rows[0].equipmentCode : "TUTTI_APPARECCHI"}_${({ metal: "METALLICHE", internal: "INTERNE", both: "DUE_FOGLI" } as const)[kind]}.xlsx` };
}

export async function exportLabels(rows: EndpointState[], kind: LabelKind): Promise<void> {
  const XLSX = await import("xlsx");
  const { workbook, filename } = buildLabelWorkbook(rows, kind, XLSX);
  XLSX.writeFile(workbook, filename);
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function printLabels(rows: EndpointState[], kind: LabelKind): void {
  rows = printableEndpoints(rows);
  const labels = labelRows(rows, kind);
  const popup = window.open("", "_blank");
  if (!popup) throw new TarghettiError("Consenti l’apertura della finestra di stampa nel browser.");
  const doc = popup.document;
  doc.title = "TARGHETTI";
  doc.documentElement.lang = "it";
  const style = doc.createElement("style");
  style.textContent = "body{font:16px Arial;margin:20mm}h1{font-size:18px}table{width:100%;border-collapse:collapse}td{border:1px solid #999;padding:8px;font-family:monospace}.sheet{break-after:page}.sheet:last-child{break-after:auto}@page{size:A4;margin:15mm}";
  doc.head.append(style);
  const groups = [...new Set(rows.map(e => e.equipmentCode))];
  for (const code of groups) {
    for (const type of (kind === "both" ? ["metal", "internal"] : [kind])) {
      const section = doc.createElement("section"), h = doc.createElement("h1"), table = doc.createElement("table");
      section.className = "sheet"; h.textContent = `${code} · ${type === "metal" ? "Marca cavo — targhette metalliche" : "Marca cavo + collegamento — targhette interne"}`;
      rows.forEach((row, index) => {
        if (row.equipmentCode !== code) return;
        const tr = doc.createElement("tr"), td = doc.createElement("td");
        td.textContent = type === "metal" ? labels.metal[index] : labels.internal[index]; tr.append(td); table.append(tr);
      });
      section.append(h, table); doc.body.append(section);
    }
  }
  doc.close(); popup.focus(); popup.print();
}
