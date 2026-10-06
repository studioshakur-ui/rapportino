import { useEffect, useRef, useState } from "react";
import type { TarghettiCatalogue, PositionEvidence } from "./targhetti.types";
import { downloadSource } from "./targhetti.repository";
import { italianError } from "./targhetti.locale";

interface Props { path: string; catalogue: TarghettiCatalogue; page: number; setPage: (page: number) => void; evidence?: PositionEvidence[] }
export default function DiagramViewer({ path, catalogue, page, setPage, evidence = [] }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), container = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0), [width, setWidth] = useState(900), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const source = catalogue.pages[page - 1];
  const scale = zoom || Math.min(1.5, Math.max(.15, (width - 2) / (source?.width ?? 1190)));
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(element);return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    setBuffer(null); setLoading(true); setError("");
    downloadSource(path).then(blob => blob.arrayBuffer()).then(bytes => { if (active) setBuffer(bytes); }).catch(e => { if (active) { setError(italianError(e, "Impossibile caricare il PDF. Riprova.")); setLoading(false); } });
    return () => { active = false; };
  }, [path]);
  useEffect(() => {
    if (!buffer || !canvas.current) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setLoading(true); setError("");
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      if (cancelled) return;
      const task = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      cleanup = () => { void task.destroy(); };
      const pdf = await task.promise;
      if (cancelled) return;
      const pdfPage = await pdf.getPage(page), viewport = pdfPage.getViewport({ scale });
      const element = canvas.current;
      if (!element || cancelled) return;
      // Detached canvas prevents a previous render from racing the next page.
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.ceil(viewport.width); offscreen.height = Math.ceil(viewport.height);
      await pdfPage.render({ canvasContext: offscreen.getContext("2d")!, viewport }).promise;
      if (cancelled) return;
      element.width = offscreen.width; element.height = offscreen.height;
      element.getContext("2d")!.drawImage(offscreen, 0, 0);
      setLoading(false);
    })().catch(e => { if (!cancelled) { setError(italianError(e, "Impossibile visualizzare questa pagina del PDF.")); setLoading(false); } });
    return () => { cancelled = true; cleanup?.(); };
  }, [buffer, page, scale]);
  if (!source) return null;
  return <section className="tg-panel">
    <div className="tg-toolbar">
      <strong>Schema originale</strong>
      <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Pagina precedente">←</button>
      <label>Pagina <input aria-label="Pagina PDF" type="number" min={1} max={catalogue.pages.length} value={page} onChange={e => setPage(Math.max(1, Math.min(catalogue.pages.length, Number(e.target.value) || 1)))} style={{ width: 65 }} /></label>
      <span>/ {catalogue.pages.length}</span>
      <button disabled={page === catalogue.pages.length} onClick={() => setPage(page + 1)} aria-label="Pagina successiva">→</button>
      <select aria-label="Zoom PDF" value={zoom} onChange={e => setZoom(Number(e.target.value))}><option value={0}>Adatta allo schermo</option>{[0.75, 1, 1.5, 2, 3].map(v => <option key={v} value={v}>{v * 100} %</option>)}</select>
    </div>
    <p className="tg-muted">{source.annex ? `Allegato ${source.annex} · ` : ""}{source.revision ? `Revisione ${source.revision} · ` : ""}{source.equipmentCodes.length} riferimenti apparecchio</p>
    {error && <p role="alert" className="tg-error">{error}</p>}
    {loading && <p role="status">Caricamento del disegno…</p>}
    <div className="tg-diagram-scroll" ref={container}><div style={{ position: "relative", width: source.width * scale, height: source.height * scale }}>
      <canvas ref={canvas} aria-label={`Disegno PDF pagina ${page}`} />
      {evidence.filter(e => e.page === page && e.box.width > 0).map((e, i) => <span key={i} title={e.position} className="tg-highlight" style={{ left: e.box.x * scale - 3, top: e.box.y * scale - 3, width: e.box.width * scale + 6, height: e.box.height * scale + 6 }} />)}
    </div></div>
    <details className="tg-source-text"><summary>Testo, note e riferimenti della pagina</summary><pre>{source.text}</pre><p>{source.cableMarks.join(" · ")}</p></details>
  </section>;
}
