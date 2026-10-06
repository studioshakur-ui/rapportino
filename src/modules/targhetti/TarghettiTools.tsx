import { useState } from "react";
import { italianSourceIssue } from "./targhetti.locale";
import { asRecord, isPrintableMark, normalizeMark } from "./targhetti.logic";
import { downloadSource, importPayload, proposeImport, proposeManualConnection } from "./targhetti.repository";
import { exportLabels, saveBlob } from "./targhetti.export";
import type { EndpointState, ManualConnection, TarghettiCatalogue, TarghettiEvent, TarghettiImportPayload } from "./targhetti.types";

type Action = (work: () => Promise<unknown>, success?: string) => Promise<void>;
interface Props {
  catalogue: TarghettiCatalogue | null; payload: TarghettiImportPayload | null;
  imports: TarghettiEvent[]; importId: string; chooseImport: (id: string) => void;
  rows: EndpointState[]; active: boolean; busy: boolean; act: Action;
  refresh: (preferred?: string) => Promise<void>; openPDF: (page: number) => void; close: () => void;
}
export default function TarghettiTools({ catalogue, payload, imports, importId, chooseImport, rows, active, busy, act, refresh, openPDF, close }: Props) {
  const [query,setQuery] = useState("");
  const [files,setFiles] = useState<{ catalogue?: File; pdf?: File; excel?: File }>({});
  const [manual,setManual] = useState<ManualConnection>({ cableMark:"",cableType:"",page:1,fromCode:"",toCode:"",fromLocal:"",toLocal:"",fromPosition:"",toPosition:"" });
  const pages = catalogue?.pages.filter(p => !query || normalizeMark(`${p.text} ${p.equipmentCodes.join(" ")}`).includes(normalizeMark(query))) ?? [];
  const missing = catalogue ? [...new Set(catalogue.pages.flatMap(p => p.cableMarks))].filter(mark => isPrintableMark(mark) && !rows.some(e => normalizeMark(e.cableMark) === normalizeMark(mark))) : [];
  const issues = catalogue?.issues.filter(issue => !/^(Excel :|PDF :|\d+ extrémités)/.test(issue) && !issue.includes("*")).map(italianSourceIssue) ?? [];
  return <section id="tg-tools" className="tg-panel tg-tools" aria-label="Documenti e strumenti">
    <div className="tg-tools-heading"><h2>Documenti e strumenti</h2><button onClick={close}>Torna alla preparazione</button></div>
    {imports.length > 1 && <label>Fascicolo<select aria-label="Fascicolo TARGHETTI" value={importId} onChange={e=>chooseImport(e.target.value)}>{imports.map(e=><option key={e.id} value={e.id}>{importPayload(e).pdfName} · {e.validation_status === "pending" ? "Da confermare" : "confermato"}</option>)}</select></label>}
    <div className="tg-toolbar"><button disabled={busy} onClick={()=>act(()=>refresh())}>Aggiorna i dati</button>{payload && <><button onClick={()=>act(async()=>saveBlob(await downloadSource(payload.pdfPath),payload.pdfName))}>PDF originale</button><button onClick={()=>act(async()=>saveBlob(await downloadSource(payload.excelPath),payload.excelName))}>Excel originale</button></>}</div>
    {catalogue && <>
      <details><summary>Cerca nel PDF · {catalogue.pages.length} pagine</summary><label>Testo o riferimento<input aria-label="Cerca nel PDF" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Codice apparecchio, cavo, nota…" /></label><div className="tg-page-index">{pages.map(p=><button key={p.number} onClick={()=>openPDF(p.number)}>Pagina {p.number}{p.annex ? ` · allegato ${p.annex}` : ""}<small>{p.cableMarks.filter(isPrintableMark).length} marche senza asterisco</small></button>)}</div></details>
      <details><summary>Differenze da verificare tra le fonti</summary><p className="tg-muted">{rows.filter(e=>!e.candidates.length && !e.confirmedPosition).length} collegamenti da rilevare sul disegno. {rows.filter(e=>new Set(e.candidates.map(c=>c.position)).size>1 && !e.confirmedPosition).length} collegamenti con più riferimenti possibili.</p><ul>{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>
      <details><summary>Aggiungi un cavo presente solo nel PDF</summary><p className="tg-muted">Rileva la marca cavo, i due apparecchi e i rispettivi collegamenti. I cavi con * sono esclusi.</p><div className="tg-toolbar">{missing.map(mark=><button key={mark} onClick={()=>{const p=catalogue.pages.find(p=>p.cableMarks.includes(mark));setManual(v=>({...v,cableMark:mark,page:p?.number ?? 1}));if(p)openPDF(p.number);}}>{mark}</button>)}</div><div className="tg-manual-grid">{([["cableMark","Marca cavo esatta"],["cableType","Tipo di cavo"],["fromCode","Apparecchio di partenza"],["toCode","Apparecchio di arrivo"],["fromLocal","Locale di partenza"],["toLocal","Locale di arrivo"],["fromPosition","Collegamento di partenza"],["toPosition","Collegamento di arrivo"]] as const).map(([key,label])=><label key={key}>{label}<input aria-label={label} value={manual[key]} onChange={e=>setManual(v=>({...v,[key]:e.target.value}))}/></label>)}<label>Pagina del disegno<input aria-label="Pagina di riferimento del cavo aggiunto" type="number" min={1} max={catalogue.pages.length} value={manual.page} onChange={e=>setManual(v=>({...v,page:Number(e.target.value)}))}/></label></div><div className="tg-toolbar"><button disabled={!active || busy} onClick={()=>act(async()=>{await proposeManualConnection(catalogue,rows,manual);await refresh();},"Cavo proposto. Verifica le estremità nella proposta qui sotto.")}>Proponi questo cavo</button><button onClick={()=>openPDF(Math.max(1,Math.min(catalogue.pages.length,manual.page || 1)))}>Vedi la pagina di riferimento</button></div></details>
      <details><summary>Esportazione per tutti gli apparecchi</summary><p className="tg-muted">{rows.length.toLocaleString("it-IT")} targhette metalliche, un foglio per apparecchio. I cavi con * sono esclusi.</p><button disabled={!active || busy || !rows.length} onClick={()=>act(()=>exportLabels(rows,"metal"),"Fogli delle targhette metalliche esportati per tutti gli apparecchi.")}>Esporta tutte le metalliche</button></details>
    </>}
    <details><summary>Importa un altro fascicolo</summary><p className="tg-muted">Utilizza il catalogo .core.json e i file PDF / Excel corrispondenti.</p><div className="tg-manual-grid">{([["catalogue","Catalogo .core.json",".json"],["pdf","Schema PDF",".pdf"],["excel","Excel dei cavi",".xlsx"]] as const).map(([key,label,accept])=><label key={key} className="tg-file-picker">{label}<span className="tg-file-button">Seleziona file</span><input type="file" className="sr-only" aria-label={label} accept={accept} onChange={e=>setFiles(f=>({...f,[key]:e.target.files?.[0]}))}/><small>{files[key]?.name ?? "Nessun file selezionato"}</small></label>)}</div><button disabled={busy || !files.catalogue || !files.pdf || !files.excel} onClick={()=>act(async()=>{const e=await proposeImport(files.catalogue!,files.pdf!,files.excel!);await refresh(e.id);},"Fascicolo caricato, in attesa della tua conferma.")}>Carica questo fascicolo</button></details>
    {catalogue && payload && <details><summary>Informazioni del fascicolo</summary><p>{catalogue.excel.name}</p><p>{catalogue.pdf.name}</p><p className="tg-muted">{new Set(rows.filter(e=>e.sourceSheet === "DATI").map(e=>e.sourceRow)).size} cavi Excel inclusi · {new Set(rows.map(e=>e.equipmentCode)).size} apparecchi · {catalogue.pages.length} pagine PDF.</p><button onClick={()=>act(async()=>saveBlob(await downloadSource(payload.cataloguePath),"TARGHETTI.core.json"))}>Scarica il catalogo originale</button></details>}
  </section>;
}

export function PendingReview({ events, catalogue, rows, busy, act, decide }: { events:TarghettiEvent[]; catalogue:TarghettiCatalogue; rows:EndpointState[]; busy:boolean; act:Action; decide:(event:TarghettiEvent,status:"validated"|"rejected")=>Promise<void> }) {
  const records = events.map(event=>{
    const p=asRecord(event.payload), additions=Array.isArray(p.endpoints)?p.endpoints:[], changes=Array.isArray(p.changes)?p.changes:[], labels=Array.isArray(p.labels)?p.labels:[];
    const data=additions.length ? additions.map(raw=>{const a=asRecord(raw),c=changes.map(asRecord).find(c=>c.endpointId===a.id);return {...a,endpointId:a.id,position:c?.position,page:a.sourceRow};}) : changes.length ? changes : labels;
    const lookup=new Map([...catalogue.endpoints,...rows].map(e=>[e.id,e]));
    const lines=data.map(raw=>{const c=asRecord(raw),row=lookup.get(String(c.endpointId));return {code:row?.equipmentCode ?? String(c.equipmentCode ?? ""),mark:row?.cableMark ?? String(c.cableMark ?? ""),position:String(c.position ?? "Collegamento da rilevare"),page:c.page,kind:c.kind};}).filter(c=>c.mark && isPrintableMark(c.mark));
    return {event,lines,adding:additions.length>0};
  }).filter(r=>r.lines.length);
  if (!records.length) return null;
  return <section className="tg-panel tg-pending"><h2>Proposte da verificare · {records.length}</h2>{records.map(({event,lines,adding})=><details key={event.id}><summary>{lines.length} {adding ? "estremità da aggiungere" : event.event_type === "targhetti.positions" ? "collegamenti" : "targhette registrate come stampate"}</summary><div className="tg-review-lines">{lines.map((c,i)=><p key={i}>{c.code} · <strong>{c.mark}</strong> · {c.position}{c.page ? ` · pagina ${c.page}` : ""}{c.kind ? ` · ${c.kind === "metal" ? "metallica" : "interne"}` : ""}</p>)}</div><div className="tg-toolbar"><button disabled={busy} onClick={()=>act(()=>decide(event,"validated"),"Proposta confermata.")}>Conferma queste righe</button><button disabled={busy} onClick={()=>act(()=>decide(event,"rejected"))}>Rifiuta</button></div></details>)}</section>;
}
