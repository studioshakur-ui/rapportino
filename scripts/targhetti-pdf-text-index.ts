// Index source text by writing direction and glyph baseline; no port inference.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const program = String.raw`
import fitz,json,re,sys,hashlib,math,collections,os
source,catalogue_path,output=sys.argv[1:4]
with open(catalogue_path,encoding='utf-8-sig') as f: catalogue=json.load(f)
with open(source,'rb') as f: sha=hashlib.file_digest(f,'sha256').hexdigest()
if sha!=catalogue['pdf']['sha256']: raise ValueError('Catalogue PDF hash mismatch')
norm=lambda s:re.sub(r'\s+','',s.upper())
equipnorm=lambda s:re.sub(r'[.\s]','',s.upper())
marks=collections.defaultdict(list); equipment=collections.defaultdict(list)
for e in catalogue['endpoints']:
    if e['cableMark'] not in marks[norm(e['cableMark'])]:marks[norm(e['cableMark'])].append(e['cableMark'])
    if e['equipmentCode'] not in equipment[equipnorm(e['equipmentCode'])]:equipment[equipnorm(e['equipmentCode'])].append(e['equipmentCode'])
# Named source aliases are emitted explicitly, never silently substituted.
aliases={f'EXTENDERSMS#{i}':f'EXTENDSMS#{i}' for i in range(1,5)}
for alias,code in aliases.items():
    if code in equipment:equipment[alias].append(code)
patterns={name:re.compile('|'.join(re.escape(s) for s in sorted(mapping,key=len,reverse=True))) for name,mapping in [('cable',marks),('equipment',equipment)]}
occurrences={'cable':[],'equipment':[]}; port_occurrences=[]; audits=[]; seen=set()
port_pattern=re.compile(r'(?<![A-Z0-9])(?:P\s*\d+\s*J\s*\d+[A-Z]?|JM\s*\d+|PWR|7/8\s*["\x27]{1,2}\s*EIA|P/P\s*Ottico(?!\s*(?:J|Pt\.?)?\s*\d)|PP[A-Z0-9/]*\s*[- ]?\s*(?:J|Pt\.?)\s*\d+[A-Z]?(?:\s*[-/]\s*J?\s*\d+[A-Z]?)*|P/P\s*Ottico\s*(?:J|Pt\.?)?\s*\d+(?:[-/]J?\d+)*|(?:Input|Output)\s*\d+\s*(?:DP|USB|HDMI|DVI|VGA)?|[JXP]\s*\d+[A-Z]?(?:\s*[-/]\s*J?\s*\d+[A-Z]?)*|Pt\.?\s*\d+|TB(?:[- ]?[A-Z0-9]+)?|LC(?:\s*[- ]\s*(?:Maschio|Femmina))?|RJ\s*45|SFP\d*|M\d+|LAN\d*|ANT\d*|VHF|UHF|IN/OUT|RF\s*TERM(?:INATION)?|TBD)(?![A-Z0-9])',re.I)
def unionbox(chars):
    return {'x':min(c['bbox'][0] for c in chars),'y':min(c['bbox'][1] for c in chars),'width':max(c['bbox'][2] for c in chars)-min(c['bbox'][0] for c in chars),'height':max(c['bbox'][3] for c in chars)-min(c['bbox'][1] for c in chars)}
doc=fitz.open(source)
for page in doc:
    direction_groups=collections.defaultdict(list)
    source_lines=[]
    for bi,block in enumerate(page.get_text('rawdict')['blocks']):
        for li,line in enumerate(block.get('lines',[])):
            dx,dy=line['dir']; direction=(round(dx,4),round(dy,4))
            source_chars=[]
            for si,span in enumerate(line['spans']):
                for ci,c in enumerate(span['chars']):
                    if not c['c']:continue
                    x,y=c['origin'];item={**c,'size':span['size'],'id':f'{bi}:{li}:{si}:{ci}','t':x*dx+y*dy,'n':-x*dy+y*dx}
                    direction_groups[direction].append(item);source_chars.append(item)
            # Preserve genuine native lines too: adjacent labels can share a baseline.
            if source_chars:source_lines.append((direction,sorted(source_chars,key=lambda c:c['t'])))
    runs=list(source_lines)
    for direction,chars in direction_groups.items():
        baselines=[]
        for c in sorted(chars,key=lambda c:c['n']):
            # Font-derived line tolerance with a strict cap separates tiny parallel labels.
            tolerance=min(.8,max(.2,c['size']*.08))
            if baselines and abs(c['n']-baselines[-1][0])<=tolerance:baselines[-1][1].append(c)
            else:baselines.append((c['n'],[c]))
        for baseline,cs in baselines:
            current=[];previous=None
            for c in sorted(cs,key=lambda c:c['t']):
                if previous is not None:
                    # Break genuinely separated labels, preserving ordinary word spacing.
                    prev_width=max(previous['bbox'][2]-previous['bbox'][0],previous['bbox'][3]-previous['bbox'][1])
                    if c['t']-previous['t']-prev_width>max(5,c['size']*1.8):
                        if current:runs.append((direction,current))
                        current=[]
                # Suppress identical overprinted glyphs only at the same origin.
                if not current or c['c']!=current[-1]['c'] or abs(c['t']-current[-1]['t'])>.05:current.append(c)
                previous=c
            if current:runs.append((direction,current))
    page_counts=collections.Counter()
    for direction,chars in runs:
        raw_run=''.join(c['c'] for c in chars)
        # Connector text candidates only. The resolver must prove a frame/path contact.
        for match in port_pattern.finditer(raw_run):
            start,end=match.span();selected=chars[start:end]
            if not selected:continue
            # RJ45 inside an equipment title names its type, not a connector position.
            if re.search(r'BORCHIA\s*$',raw_run[max(0,start-20):start],re.I):continue
            bbox=unionbox(selected);text=re.sub(r'\s+',' ',match.group()).strip()
            key=('port',text,page.number,round(bbox['x'],2),round(bbox['y'],2))
            if key in seen:continue
            seen.add(key);page_counts['port']+=1
            port_occurrences.append({'text':text,'rawText':match.group(),'page':page.number+1,'box':bbox,'direction':list(direction),'method':'glyph-baseline-direction-port-candidate-v1'})
        for kind,mapping in [('cable',marks),('equipment',equipment)]:
            compact=[];indices=[]
            for i,c in enumerate(chars):
                for letter in c['c'].upper():
                    if letter.isspace() or (kind=='equipment' and letter=='.'):continue
                    compact.append(letter);indices.append(i)
            compact=''.join(compact)
            for match in patterns[kind].finditer(compact):
                start,end=match.span();selected=chars[indices[start]:indices[end-1]+1]
                # A contiguous alphanumeric suffix/prefix belongs to another source mark.
                boundary_bad=False
                for adjacent,edge in [(indices[start]-1,indices[start]),(indices[end-1]+1,indices[end-1])]:
                    if 0<=adjacent<len(chars) and re.search(r'[A-Z0-9#*]',chars[adjacent]['c'],re.I):
                        a,b=chars[adjacent],chars[edge]
                        advance=abs(a['t']-b['t']);width=min(max(a['bbox'][2]-a['bbox'][0],a['bbox'][3]-a['bbox'][1]),max(b['bbox'][2]-b['bbox'][0],b['bbox'][3]-b['bbox'][1]))
                        if advance<width*1.05:boundary_bad=True
                if boundary_bad:continue
                bbox=unionbox(selected);raw=''.join(c['c'] for c in selected)
                for value in mapping[match.group()]:
                    key=(kind,value,page.number,round(bbox['x'],2),round(bbox['y'],2))
                    if key in seen:continue
                    seen.add(key);page_counts[kind]+=1
                    item={'page':page.number+1,'box':bbox,'rawText':raw,'direction':list(direction),'method':'glyph-baseline-direction-v1','spanIds':sorted(set(':'.join(c['id'].split(':')[:3]) for c in selected))}
                    if kind=='cable':item.update(cableMark=value,normalizedMark=norm(value))
                    else:item.update(equipmentCode=value,normalizedCode=equipnorm(value),alias=match.group() if match.group() in aliases else None)
                    occurrences[kind].append(item)
    audits.append({'page':page.number+1,'glyphCount':sum(map(len,direction_groups.values())),'baselineRuns':len(runs),**dict(page_counts)})
found={o['normalizedMark'] for o in occurrences['cable']}
unseen=[values[0] for mark,values in marks.items() if mark not in found]
result={'schema':'core.targhetti.pdf-text-index.v1','documentSha256':sha,'extractorVersion':'glyph-baseline-direction-v1','cableOccurrences':occurrences['cable'],'equipmentOccurrences':occurrences['equipment'],'portOccurrences':port_occurrences,'audit':{'pages':audits,'uniqueCableMarksFound':len(found),'unseenCableMarks':unseen,'unseenPrintableCableMarks':[m for m in unseen if '*' not in m],'limitations':['Text occurrence only; no cable path or port inferred','Port occurrences are candidate text only, never certified connections','Named aliases are explicit and still require frame association','No OCR; missing source glyphs remain unindexed']}}
os.makedirs(os.path.dirname(os.path.abspath(output)),exist_ok=True)
with open(output,'w',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'),allow_nan=False)
print(json.dumps({'output':output,'cableOccurrences':len(occurrences['cable']),'equipmentOccurrences':len(occurrences['equipment']),'uniqueCableMarksFound':len(found),'unseenPrintableCableMarks':len(result['audit']['unseenPrintableCableMarks'])}))
`;

const args = process.argv.slice(2);
if (args.length !== 5 || args[3] !== "--python") {
  console.error("Usage: targhetti-pdf-text-index <source.pdf> <catalogue.json> <output.json> --python <python>");
  process.exitCode = 1;
} else {
  const result = spawnSync(args[4], ["-c", program, ...args.slice(0, 3).map(p => resolve(p))], { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) { console.error(result.error?.message ?? result.stderr); process.exitCode = 1; }
  else process.stdout.write(result.stdout);
}
