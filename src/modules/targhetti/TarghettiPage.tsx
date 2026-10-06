import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { asRecord, equipmentGroups, hasInternalLabel, internalLabel, isPrintableMark, normalizeMark, positionChanges, projectEndpoints } from "./targhetti.logic";
import { importPayload, listTarghettiEvents, loadAutomaticResolution, loadCatalogue, proposePositions, proposePrinted, targhettiBus } from "./targhetti.repository";
import { exportLabels, printLabels } from "./targhetti.export";
import DiagramDialog from "./DiagramDialog";
import TarghettiTools, { PendingReview } from "./TarghettiTools";
import type { EndpointState, LabelKind, TarghettiCatalogue, TarghettiEvent } from "./targhetti.types";
import type { ResolutionPacket } from "./targhetti.resolution";
import "./targhetti.css";
import { equipmentDescription, italianError } from "./targhetti.locale";

const messageOf = italianError;
const suggestedPosition = (e: EndpointState) => {
  const values = [...new Set(e.candidates.map(c => c.position))];
  return values.length === 1 ? values[0] : "";
};

export default function TarghettiPage() {
  const { uid } = useAuth();
  const [events,setEvents] = useState<TarghettiEvent[]>([]), [importId,setImportId] = useState("");
  const [catalogue,setCatalogue] = useState<TarghettiCatalogue | null>(null);
  const [resolution,setResolution] = useState<{catalogueId:string;packet:ResolutionPacket} | null>(null);
  const [equipment,setEquipment] = useState("411005010001"), [appSearch,setAppSearch] = useState("");
  const [pickerOpen,setPickerOpen] = useState(false), [pickerLimit,setPickerLimit] = useState(12);
  const [cableSearch,setCableSearch] = useState(""), [rowPage,setRowPage] = useState(0);
  const [selected,setSelected] = useState<Set<string>>(new Set()), [edits,setEdits] = useState<Record<string,string>>({});
  const [page,setPage] = useState(3), [focus,setFocus] = useState(""), [showDiagram,setShowDiagram] = useState(false);
  const [showTools,setShowTools] = useState(false), [initialLoading,setInitialLoading] = useState(true), [busy,setBusy] = useState(false);
  const [error,setError] = useState(""), [notice,setNotice] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const imports = events.filter(e=>e.event_type === "targhetti.import" && e.validation_status !== "rejected" && asRecord(e.payload).owner_id === uid);
  const currentImport = imports.find(e=>e.id === importId);
  const active = currentImport?.validation_status === "validated" && currentImport.validated_by === uid;
  const payload = currentImport ? importPayload(currentImport) : null;
  const rows = useMemo(()=>catalogue && uid ? projectEndpoints(catalogue,events,uid,resolution?.catalogueId === catalogue.id ? resolution.packet : null) : [],[catalogue,events,uid,resolution]);
  const groups = useMemo(()=>equipmentGroups(rows),[rows]);
  const appRows = useMemo(()=>rows.filter(e=>e.equipmentCode === equipment),[rows,equipment]);
  const group = groups.find(g=>g.code === equipment);
  const selectedRows = appRows.filter(e=>selected.has(e.id));
  const focused = rows.find(e=>e.id === focus);
  const draftValue = (e:EndpointState) => edits[e.id] ?? e.confirmedPosition ?? (e.internalDirect ? "" : suggestedPosition(e));
  const missingCount = selectedRows.filter(e=>!hasInternalLabel(e)).length;
  const internalReady = selectedRows.length > 0 && missingCount === 0 && !selectedRows.some(e=>edits[e.id] !== undefined && edits[e.id].trim() !== (e.confirmedPosition ?? ""));
  const changes = positionChanges(selectedRows,edits,page).filter(c=>{
    const row=selectedRows.find(e=>e.id===c.endpointId);
    return row?.confirmedPosition !== c.position || row?.confirmedPage !== c.page;
  });
  const visibleRows = appRows.filter(e=>!cableSearch || normalizeMark(`${e.cableMark} ${e.cableType} ${e.otherEquipmentCode}`).includes(normalizeMark(cableSearch)));
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(e=>selected.has(e.id));
  const filteredGroups = useMemo(()=>{
    const q=normalizeMark(appSearch).replace(/\./g,"");
    if (!q) return [...groups].sort((a,b)=>Number(b.code === equipment)-Number(a.code === equipment) || a.code.localeCompare(b.code));
    const codes=new Set(rows.filter(e=>normalizeMark(e.cableMark).includes(q)).map(e=>e.equipmentCode));
    return groups.filter(g=>normalizeMark(`${g.code} ${g.description} ${g.local}`).includes(q) || codes.has(g.code));
  },[appSearch,groups,rows,equipment]);
  const pending = events.filter(e=>e.validation_status === "pending" && e.event_type !== "targhetti.import" && asRecord(e.payload).catalogueId === catalogue?.id).reverse();

  async function refresh(preferred?:string) {
    const next=await listTarghettiEvents(); setEvents(next);
    setImportId(previous=>preferred ?? (next.some(e=>e.id===previous && e.validation_status!=="rejected") ? previous : [...next].reverse().find(e=>e.event_type==="targhetti.import" && e.validation_status!=="rejected")?.id ?? ""));
  }
  async function act(work:()=>Promise<unknown>,success?:string) {
    setBusy(true);setError("");setNotice("");
    try {await work();if(success)setNotice(success);} catch(e){setError(messageOf(e));} finally{setBusy(false);}
  }
  async function decide(event:TarghettiEvent,status:"validated"|"rejected") {
    if(status==="validated" && event.event_type==="targhetti.import")await loadCatalogue(event);
    await targhettiBus.decide(event.id,status);await refresh();
  }
  async function confirmPositions() {
    // An explicit owner click validates the positions visible in this form.
    // Both pending creation and validation pass through the central event bus.
    const event=await proposePositions(catalogue!.id,changes);
    await targhettiBus.decide(event.id,"validated");await refresh();
    setEdits(previous=>{const next={...previous};for(const c of changes)delete next[c.endpointId];return next;});
  }
  async function markPrinted(kind:LabelKind) {
    const event=await proposePrinted(catalogue!.id,selectedRows,kind);
    await targhettiBus.decide(event.id,"validated");await refresh();
  }
  function openPDF(target:number,row?:EndpointState) {
    setPage(target);setFocus(row?.id ?? "");setShowDiagram(true);
  }
  function openRowPDF(row:EndpointState) {
    const target=row.confirmedPage ?? row.candidates[0]?.page ?? catalogue?.pages.find(p=>p.equipmentCodes.includes(equipment) && p.cableMarks.some(m=>normalizeMark(m)===normalizeMark(row.cableMark)))?.number ?? page;
    openPDF(target,row);
  }
  function selectVisible(checked:boolean) {
    setSelected(previous=>{const next=new Set(previous);for(const e of visibleRows){if(checked)next.add(e.id);else next.delete(e.id);}return next;});
  }

  useEffect(()=>{
    let cancelled=false;setEvents([]);setCatalogue(null);setImportId("");setInitialLoading(true);
    listTarghettiEvents().then(next=>{if(cancelled)return;setEvents(next);setImportId([...next].reverse().find(e=>e.event_type==="targhetti.import" && e.validation_status!=="rejected")?.id ?? "");}).catch(e=>{if(!cancelled)setError(messageOf(e));}).finally(()=>{if(!cancelled)setInitialLoading(false);});
    return ()=>{cancelled=true;};
  },[uid]);
  useEffect(()=>{
    let cancelled=false;setCatalogue(null);setEdits({});setShowDiagram(false);
    if(!currentImport)return;
    loadCatalogue(currentImport).then(c=>{
      if(cancelled)return;setCatalogue(c);setPage(Math.min(3,c.pages.length));
      const available=c.endpoints.filter(e=>isPrintableMark(e.cableMark));
      setEquipment(previous=>available.some(e=>e.equipmentCode===previous) ? previous : available[0]?.equipmentCode ?? "");
    }).catch(e=>{if(!cancelled)setError(messageOf(e));});
    return ()=>{cancelled=true;};
  },[importId]);
  useEffect(()=>{
    setSelected(new Set(appRows.map(e=>e.id)));setEdits({});setCableSearch("");setRowPage(0);setFocus("");
    const match=catalogue?.pages.find(p=>p.equipmentCodes.includes(equipment));if(match)setPage(match.number);
  },[equipment,catalogue]);
  useEffect(()=>{
    let cancelled=false;
    setResolution(null);
    if (catalogue && uid) loadAutomaticResolution(catalogue,events,uid).then(packet=>{if(!cancelled)setResolution(packet ? {catalogueId:catalogue.id,packet} : null);}).catch(e=>{if(!cancelled)setError(messageOf(e));});
    return ()=>{cancelled=true;};
  },[catalogue,events,uid]);
  useEffect(()=>{setRowPage(0);},[cableSearch]);
  useEffect(()=>{setPickerLimit(12);},[appSearch]);
  useEffect(()=>{if(showTools)document.getElementById("tg-tools")?.scrollIntoView({block:"start"});},[showTools]);
  useEffect(()=>{
    const close=(e:PointerEvent)=>{if(pickerRef.current && !pickerRef.current.contains(e.target as Node))setPickerOpen(false);};
    document.addEventListener("pointerdown",close);return ()=>document.removeEventListener("pointerdown",close);
  },[]);

  return <div className="tg-root" lang="it">
    <header className="tg-header"><h1>TARGHETTI</h1><button aria-expanded={showTools} aria-controls="tg-tools" onClick={()=>setShowTools(v=>!v)}>{showTools ? "Chiudi" : "Strumenti"}{pending.length>0 && <span className="tg-count">{pending.length}</span>}</button></header>
    {error && <p role="alert" className="tg-error">{error}</p>}{notice && <p role="status" className="tg-success">{notice}</p>}
    {(initialLoading || currentImport && !catalogue && !error) && <p role="status">Caricamento…</p>}
    {!initialLoading && !imports.length && <section className="tg-panel"><button onClick={()=>setShowTools(true)}>Carica fascicolo</button></section>}
    {catalogue && payload && currentImport && <>
      {!active && <div className="tg-activation"><strong>Fascicolo da confermare</strong><button disabled={busy} className="tg-primary" onClick={()=>act(()=>decide(currentImport,"validated"),"Fascicolo confermato.")}>Conferma</button></div>}
      <section id="tg-app" className="tg-panel tg-app-choice" aria-label="Apparecchio"><div className="tg-choice-row"><div className="tg-picker" ref={pickerRef}><input aria-label="Cerca un apparecchio" placeholder="Cerca apparecchio o rack…" value={appSearch} onFocus={()=>setPickerOpen(true)} onChange={e=>{setAppSearch(e.target.value);setPickerOpen(true);}} onKeyDown={e=>{if(e.key==="Escape")setPickerOpen(false);}} aria-expanded={pickerOpen} aria-controls="tg-app-results" />{pickerOpen && <div id="tg-app-results" className="tg-picker-results">{filteredGroups.slice(0,pickerLimit).map(g=><button key={g.code} aria-label={`Scegli ${g.code} ${equipmentDescription(g.description)}`} aria-current={equipment===g.code ? "true" : undefined} onClick={()=>{setEquipment(g.code);setPickerOpen(false);setAppSearch("");}}><strong>{equipmentDescription(g.description) || g.code}</strong><span>{g.code} · {g.local} · {g.count}</span></button>)}{!filteredGroups.length && <p>Nessun risultato</p>}{filteredGroups.length>pickerLimit && <button onClick={()=>setPickerLimit(v=>v+12)}>Altri</button>}</div>}</div><div className="tg-selected-app"><strong>{equipmentDescription(group?.description ?? "") || equipment || "—"}</strong><span><code>{equipment}</code>{group?.local ? ` · ${group.local}` : ""}</span></div></div></section>
      <div className="tg-workspace">
        <section id="tg-cables" className="tg-panel tg-preparation"><div className="tg-list-tools"><h2>Cavi <span className="tg-count" aria-label={`${selectedRows.length} di ${appRows.length} cavi selezionati`}>{selectedRows.length}/{appRows.length}</span></h2><input aria-label="Cerca un cavo TARGHETTI" placeholder="Cerca cavo…" value={cableSearch} onChange={e=>setCableSearch(e.target.value)}/></div>
          <div className="tg-columns"><input type="checkbox" aria-label="Seleziona tutto" checked={allVisibleSelected} onChange={e=>selectVisible(e.target.checked)}/><span>Marca cavo</span><span>Collegamento</span><span className="sr-only">PDF</span></div>
          <div className="tg-cable-list">{visibleRows.slice(rowPage*20,(rowPage+1)*20).map(e=>{
            const draft=draftValue(e), confirmed=Boolean(e.confirmedPosition && draft.trim()===e.confirmedPosition);
            const status=e.internalDirect && !draft.trim() ? "Diretto, senza suffisso" : confirmed ? "Confermato" : draft.trim() ? "Da confermare" : "Non ancora estratto";
            return <div key={e.id} className={`tg-cable-row ${selected.has(e.id) ? "" : "tg-unselected"}`}><input type="checkbox" aria-label={`Seleziona ${e.cableMark}`} checked={selected.has(e.id)} onChange={v=>setSelected(previous=>{const next=new Set(previous);if(v.target.checked)next.add(e.id);else next.delete(e.id);return next;})}/><span className="tg-mark">{e.cableMark}</span><div className="tg-position"><input aria-label={`Collegamento ${e.cableMark}`} aria-describedby={`tg-state-${e.id}`} title={status} className={confirmed ? "tg-confirmed-input" : draft.trim() ? "tg-proposed-input" : ""} value={draft} disabled={!active || busy} placeholder={e.internalDirect ? "Diretto" : "Da estrarre"} onChange={v=>setEdits(previous=>({...previous,[e.id]:v.target.value}))}/><span id={`tg-state-${e.id}`} className="sr-only">{status}</span></div><button className="tg-icon-button" aria-label={`PDF ${e.cableMark}`} title="PDF e dettagli" onClick={()=>openRowPDF(e)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg></button></div>;
          })}</div>
          {!visibleRows.length && <p className="tg-muted">Nessun cavo</p>}
          {visibleRows.length>20 && <div className="tg-pagination"><button disabled={rowPage===0} onClick={()=>setRowPage(v=>v-1)} aria-label="Cavi precedenti">←</button><span>{rowPage*20+1}–{Math.min((rowPage+1)*20,visibleRows.length)} / {visibleRows.length}</span><button disabled={(rowPage+1)*20>=visibleRows.length} onClick={()=>setRowPage(v=>v+1)} aria-label="Cavi successivi">→</button></div>}
          {changes.length>0 && <div className="tg-confirm"><button disabled={!active || busy} onClick={()=>act(confirmPositions,`Confermati: ${changes.length}.`)}>Conferma collegamenti ({changes.length})</button></div>}
        </section>
        <section id="tg-sheets" className="tg-panel tg-printing" aria-label="Fogli">
          <div className="tg-sheet"><div className="tg-sheet-heading"><h3>Metalliche</h3><button className="tg-icon-button" aria-label="Esporta metalliche" title="Esporta metalliche" disabled={!active || busy || !selectedRows.length} onClick={()=>act(()=>exportLabels(selectedRows,"metal"),"Esportato.")}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg></button></div><ol aria-label="Anteprima foglio metalliche">{selectedRows.map(e=><li key={e.id}><span className="tg-mark">{e.cableMark}</span></li>)}</ol></div>
          <div className="tg-sheet"><div className="tg-sheet-heading"><h3>Interne {missingCount>0 && <span className="tg-count tg-attention">{missingCount} da estrarre</span>}</h3><button className="tg-icon-button" aria-label="Esporta interne" title="Esporta interne" disabled={!active || busy || !internalReady} onClick={()=>act(()=>exportLabels(selectedRows,"internal"),"Esportato.")}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg></button></div><ol aria-label="Anteprima foglio interne">{selectedRows.map(e=><li key={e.id} className={!hasInternalLabel(e) || (edits[e.id] !== undefined && edits[e.id].trim() !== (e.confirmedPosition ?? "")) ? "tg-draft-label" : ""}><span className="tg-mark">{edits[e.id]?.trim() ? `${e.cableMark} - ${edits[e.id].trim()}` : hasInternalLabel(e) ? internalLabel(e) : `${e.cableMark} - —`}</span></li>)}</ol></div>
          <button className="tg-primary tg-export-both" aria-label="Esporta i 2 fogli Excel" disabled={!active || busy || !internalReady} onClick={()=>act(()=>exportLabels(selectedRows,"both"),"Esportato.")}>Esporta Excel</button>
          {!internalReady && selectedRows.length>0 && <p className="tg-sheet-status">{missingCount ? "Estrazione incompleta." : "Conferma le modifiche."}</p>}
          <details className="tg-print-actions"><summary>Stampa</summary><button disabled={!active || busy || !internalReady} onClick={()=>{try{printLabels(selectedRows,"both");}catch(e){setError(messageOf(e));}}}>Stampa i due fogli</button><button disabled={!active || busy || !selectedRows.length} onClick={()=>act(()=>markPrinted("metal"),"Stampa registrata.")}>Registra metalliche stampate</button><button disabled={!active || busy || !internalReady} onClick={()=>act(()=>markPrinted("internal"),"Stampa registrata.")}>Registra interne stampate</button></details>
        </section>
      </div>
    </>}
    {showTools && <><TarghettiTools catalogue={catalogue} payload={payload} imports={imports} importId={importId} chooseImport={setImportId} rows={rows} active={Boolean(active)} busy={busy} act={act} refresh={refresh} openPDF={p=>openPDF(p)} close={()=>{setShowTools(false);document.getElementById("tg-app")?.scrollIntoView({block:"start"});}}/>{catalogue && pending.length>0 && <PendingReview events={pending} catalogue={catalogue} rows={rows} busy={busy || !active} act={act} decide={decide}/>}</>}
    {showDiagram && catalogue && payload && <DiagramDialog catalogue={catalogue} path={payload.pdfPath} page={page} setPage={setPage} row={focused} close={()=>setShowDiagram(false)}/>}
  </div>;
}
