// Local evidence archive only: this does not infer connections or mutate CORE.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const version = "core.targhetti.pdf-evidence.v1";
const program = String.raw`
import datetime, hashlib, json, math, os, re, sys
import fitz

source, output, version = sys.argv[1:4]
def serial(value):
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, bytes):
        return {"byteLength": len(value), "sha256": hashlib.sha256(value).hexdigest()}
    if isinstance(value, dict):
        return {str(k): serial(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serial(v) for v in value]
    if isinstance(value, (fitz.Point, fitz.Rect, fitz.Quad, fitz.Matrix)):
        return serial(list(value))
    raise TypeError("Unsupported evidence value: " + type(value).__name__)

with open(source, "rb") as stream:
    digest = hashlib.file_digest(stream, "sha256").hexdigest()
doc = fitz.open(source)
if doc.needs_pass:
    raise ValueError("Encrypted PDF requires a decrypted source")
pages = []
for page in doc:
    text = page.get_text("text", sort=False)
    words = [{"x": w[0], "y": w[1], "width": w[2]-w[0], "height": w[3]-w[1],
              "text": w[4], "block": w[5], "line": w[6], "word": w[7]}
             for w in page.get_text("words", sort=False)]
    annotations = []
    for annotation in page.annots() or []:
        annotations.append({"xref": annotation.xref, "type": annotation.type,
            "rect": annotation.rect, "info": annotation.info, "colors": annotation.colors,
            "border": annotation.border, "opacity": annotation.opacity,
            "vertices": annotation.vertices, "flags": annotation.flags})
    annex = re.search(r"ANNESSO\s*(\d+)", text, re.I)
    sheet = re.search(r"ANNESSO\s*\d+\s*PAG\.?\s*(\d+)\s*/\s*(\d+)", text, re.I)
    revisions = re.findall(r"REV\.?\s*(\d+)", text, re.I)
    drawings = page.get_drawings(extended=True)
    pages.append(serial({"number": page.number + 1, "width": page.rect.width,
        "height": page.rect.height, "rotation": page.rotation,
        "mediaBox": page.mediabox, "cropBox": page.cropbox,
        "text": text, "words": words,
        "blocks": page.get_text("dict", sort=False),
        "drawings": drawings, "annotations": annotations,
        "images": page.get_image_info(hashes=True, xrefs=True),
        "imageResources": page.get_images(full=True), "links": page.get_links(),
        "annex": annex.group(1) if annex else None,
        "annexPage": int(sheet.group(1)) if sheet else None,
        "annexPageCount": int(sheet.group(2)) if sheet else None,
        "revision": revisions[-1] if revisions else None,
        "revisionOccurrences": revisions,
        "audit": {"wordCount": len(words), "drawingCount": len(drawings),
            "segmentCount": sum(len(d.get("items", [])) for d in drawings),
            "tbdCount": len(re.findall(r"\bTBD\b", text)),
            "asteriskCount": text.count("*"), "hasText": bool(text.strip())}}))
result = {"schema": version, "extractor": {"version": version,
    "engine": "PyMuPDF", "engineVersion": fitz.VersionBind,
    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "coordinateSystem": "PDF page points, top-left origin; page rotation recorded separately",
    "purpose": "source evidence archive; no connector associations inferred"},
    "source": {"name": os.path.basename(source), "sha256": digest,
        "size": os.path.getsize(source)},
    "document": serial({"pageCount": len(doc), "metadata": doc.metadata,
        "toc": doc.get_toc(simple=False), "isPDF": doc.is_pdf,
        "embeddedFiles": [{"name": n, "info": doc.embfile_info(n)} for n in doc.embfile_names()]}),
    "pages": pages,
    "audit": {"pageCount": len(pages),
        "emptyTextPages": [p["number"] for p in pages if not p["audit"]["hasText"]],
        "tbdPages": [p["number"] for p in pages if p["audit"]["tbdCount"] > 0],
        **{k: sum(p["audit"][k] for p in pages) for k in
           ["wordCount", "drawingCount", "segmentCount", "tbdCount", "asteriskCount"]}}}
os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
temporary = output + ".partial"
try:
    with open(temporary, "w", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    os.replace(temporary, output)
finally:
    if os.path.exists(temporary): os.unlink(temporary)
print(json.dumps({"output": output, "sourceSha256": digest, "audit": result["audit"]}))
`;

function main(): void {
  const args = process.argv.slice(2);
  const [pdfPath, outputPath] = args;
  if (!pdfPath || !outputPath || args.length !== 4 || args[2] !== "--python" || !args[3]) {
    throw new Error("Usage: targhetti-pdf-extract <source.pdf> <output.json> --python <python executable>");
  }
  if (resolve(pdfPath) === resolve(outputPath)) throw new Error("Output must differ from the source PDF.");
  const result = spawnSync(args[3], ["-c", program, resolve(pdfPath), resolve(outputPath), version], {
    encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "PDF extraction failed.");
  process.stdout.write(result.stdout);
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.message : "PDF extraction failed.");
  process.exitCode = 1;
}
