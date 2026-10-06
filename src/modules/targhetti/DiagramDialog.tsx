import { useEffect, useRef } from "react";
import DiagramViewer from "./DiagramViewer";
import { sourceFieldLabel } from "./targhetti.locale";
import type { EndpointState, TarghettiCatalogue } from "./targhetti.types";

interface Props {
  catalogue: TarghettiCatalogue; path: string; page: number;
  setPage: (page: number) => void; row?: EndpointState; close: () => void;
}
export default function DiagramDialog({ catalogue, path, page, setPage, row, close }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="tg-dialog" onCancel={close} aria-labelledby="tg-pdf-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <header className="tg-dialog-header"><div><h2 id="tg-pdf-title">{row ? `${row.cableMark} · PDF` : "Schema PDF"}</h2>{row && <p className="tg-muted">Collegamento sull’apparecchio {row.equipmentCode} · {row.local}</p>}</div><button onClick={close}>Chiudi il PDF</button></header>
    <DiagramViewer path={path} catalogue={catalogue} page={page} setPage={setPage} evidence={row?.candidates} />
    {row && <details className="tg-source-details"><summary>Dettagli del cavo ({Object.keys(row.details).length} campi)</summary><dl className="tg-details">{Object.entries(row.details).map(([key,value]) => <div key={key}><dt>{sourceFieldLabel(key)}</dt><dd>{value === null ? "—" : typeof value === "boolean" ? value ? "Sì" : "No" : String(value)}</dd></div>)}</dl></details>}
  </dialog>;
}
