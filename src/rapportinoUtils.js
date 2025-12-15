// src/rapportinoUtils.js

export function getTodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}

export function formatPrevisto(value) {
  const n = parseNumeric(value);
  if (n === null) return "";
  // Sur papier, vous voulez typiquement 1 décimale (150,0)
  return n.toFixed(1).replace(".", ",");
}

export function getBaseRows(crewRole) {
  if (crewRole === "CARPENTERIA") {
    return [
      {
        id: null,
        row_index: 0,
        categoria: "CARPENTERIA",
        descrizione: "",
        operatori: "",
        tempo: "",
        previsto: "",
        prodotto: "",
        note: "",
      },
    ];
  }

  if (crewRole === "MONTAGGIO") {
    return [
      {
        id: null,
        row_index: 0,
        categoria: "MONTAGGIO",
        descrizione: "",
        operatori: "",
        tempo: "",
        previsto: "",
        prodotto: "",
        note: "",
      },
    ];
  }

  // ELETTRICISTA (papier)
  return [
    {
      id: null,
      row_index: 0,
      categoria: "STESURA",
      descrizione: "STESURA",
      operatori: "",
      tempo: "",
      previsto: "150,0",
      prodotto: "",
      note: "",
    },
    {
      id: null,
      row_index: 1,
      categoria: "STESURA",
      descrizione: "FASCETTATURA CAVI",
      operatori: "",
      tempo: "",
      previsto: "600,0",
      prodotto: "",
      note: "",
    },
    {
      id: null,
      row_index: 2,
      categoria: "STESURA",
      descrizione: "RIPRESA CAVI",
      operatori: "",
      tempo: "",
      previsto: "150,0",
      prodotto: "",
      note: "",
    },
    {
      id: null,
      row_index: 3,
      categoria: "STESURA",
      descrizione: "VARI STESURA CAVI",
      operatori: "",
      tempo: "",
      previsto: "0,2",
      prodotto: "",
      note: "",
    },
  ];
}

/**
 * Ajuste la hauteur de 2 textarea (OPERATORE / TEMPO) pour éviter tout scroll interne.
 * Attendu: wrapper avec data-ot-wrap + textarea data-ot='op' et data-ot='tm'
 */
export function adjustOperatorTempoHeights(targetElOrWrapper) {
  try {
    const root =
      targetElOrWrapper?.closest?.("[data-ot-wrap]") || targetElOrWrapper;
    if (!root) return;

    const op = root.querySelector?.("textarea[data-ot='op']");
    const tm = root.querySelector?.("textarea[data-ot='tm']");
    if (!op || !tm) return;

    op.style.height = "auto";
    tm.style.height = "auto";

    const h = Math.max(op.scrollHeight, tm.scrollHeight, 28);

    op.style.height = `${h}px`;
    tm.style.height = `${h}px`;
  } catch {
    // ignore
  }
}
