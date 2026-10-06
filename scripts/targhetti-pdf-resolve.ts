// Resolve only associations supported by vector paths and equipment boundaries.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const program = String.raw`
import fitz,json,re,sys,hashlib,math,collections,os
source,catalogue_path,output=sys.argv[1:4]
text_index=None
if len(sys.argv)>4:
    with open(sys.argv[4],encoding='utf-8') as f:text_index=json.load(f)
with open(catalogue_path,encoding='utf-8-sig') as f: catalogue=json.load(f)
with open(source,'rb') as f: sha=hashlib.file_digest(f,'sha256').hexdigest()
if catalogue['pdf']['sha256']!=sha: raise ValueError('Catalogue PDF hash mismatch')
if text_index and (text_index.get('schema')!='core.targhetti.pdf-text-index.v1' or text_index.get('documentSha256')!=sha): raise ValueError('Text index does not match source PDF')
norm=lambda s:re.sub(r'\s+','',s.upper())
equipment=lambda s:re.sub(r'[.\s]','',s.upper())
box=lambda r:{'x':r[0],'y':r[1],'width':r[2]-r[0],'height':r[3]-r[1]}
dist=lambda a,b:math.hypot(a[0]-b[0],a[1]-b[1])
marks={norm(e['cableMark']) for e in catalogue['endpoints']}
findings=collections.defaultdict(list)
descriptions={equipment(e['equipmentCode']):e['description'] for e in catalogue['endpoints']}
page_audits=[]
doc=fitz.open(source)
for page in doc:
    texts=[]
    glyph_boxes=[fitz.Rect(char['bbox']) for block in page.get_text('rawdict')['blocks'] for line in block.get('lines',[]) for span in line['spans'] for char in span['chars'] if char['c'].strip()]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            t=''.join(s['text'] for s in line['spans']).strip()
            if t:texts.append({'text':t,'rect':fitz.Rect(line['bbox'])})
    text_grid=collections.defaultdict(list)
    for t in texts:
        tr=t['rect']
        for gx in range(math.floor(tr.x0/16),math.floor(tr.x1/16)+1):
            for gy in range(math.floor(tr.y0/16),math.floor(tr.y1/16)+1):text_grid[(gx,gy)].append(tr)
    codes=[t for t in texts if re.fullmatch(r'\d{3}\.\d{3}\.\d{3}\.\d{3}',t['text'])]
    ports=[t for t in texts if re.fullmatch(r'(?:[JXPM]\s*\d+[A-Z]?(?:[-/]J?\d+)*|(?:PP[A-Z0-9/]*|P/P\s*Ottico)\s+(?:J|Pt\.?)?\s*\d+(?:[-/]J?\d+)*|Pt\.?\s*\d+|TB(?:[- ]?[A-Z0-9]+)?|(?:LC|N)(?:[- ](?:Maschio|Femmina))?|RJ\s*45|LAN|ANT|VHF|UHF|IN/OUT|(?:Input|Output)\s*\d+\s*(?:DP|USB|HDMI|DVI|VGA)?|RF\s*TERM.*|TBD)',t['text'],re.I)]
    cables=[t for t in texts if norm(t['text']) in marks]
    if text_index:
        def indexed(items,field):
            result=[]
            for item in items:
                if item['page']!=page.number+1:continue
                b=item['box'];r=fitz.Rect(b['x'],b['y'],b['x']+b['width'],b['y']+b['height'])
                result.append({'text':item[field],'rawText':item.get('rawText',item[field]),'rect':r})
            return result
        cables=indexed(text_index['cableOccurrences'],'cableMark')
        codes=indexed(text_index['equipmentOccurrences'],'equipmentCode')
        if text_index.get('portOccurrences'):ports=indexed(text_index['portOccurrences'],'text')
    description_whitelist={'BORCHIA','BORCHIARJ45','BORCHIARJ-45','DIRETE','PRESA','SCHUKO16A','PRESA16A','PRESA16APER','PRESAOTTICA','PERDDSWORKSTATION','DDSMONITORING','POSTAZ.DDSMONITORING','PERPOSTAZIONE','BOXSTAGNOPERDDS','DDS','FORSOCKETSDDS','SECTION115V','SECTION115V60HZ'}
    descriptive_lines=[t['rect'] for t in texts if norm(t['text']) in description_whitelist]
    # An RJ45 inside the printed name BORCHIA RJ45 describes the apparatus,
    # and is not a separately drawn connector designation at its terminal.
    ports=[p for p in ports if not any(dr.contains((p['rect'].tl+p['rect'].br)/2) for dr in descriptive_lines)]
    known_annotation_boxes=descriptive_lines+[c['rect'] for c in codes]
    unclassified_glyph_boxes=[g for g in glyph_boxes if not any(dr.contains((g.tl+g.br)/2) for dr in known_annotation_boxes)]
    drawings=page.get_drawings()
    frames=[]; raw=[];solid_segments=[];curves=[]
    for drawing in drawings:
        if 's' not in drawing['type']:continue
        curved_items=[i for i in drawing['items'] if i[0]=='c']
        if curved_items and len(curved_items)==len(drawing['items']) and all(dist(tuple(a[4]),tuple(b[1]))<=.8 for a,b in zip(curved_items,curved_items[1:])):
            curves.append((tuple(curved_items[0][1]),tuple(curved_items[-1][4]),[list(p) for item in curved_items for p in item[1:]]))
        for item in drawing['items']:
            if item[0] in ['qu','re']:
                r=item[1].rect if item[0]=='qu' else fitz.Rect(item[1])
                if r.width>20 and r.height>15:
                    inside=[c for c in codes if r.contains((c['rect'].tl+c['rect'].br)/2)]
                    if len({equipment(c['text']) for c in inside})==1:frames.append((r,inside[0]))
            elif item[0]=='l':
                a,b=tuple(item[1]),tuple(item[2])
                axis_aligned=abs(a[0]-b[0])<.15 or abs(a[1]-b[1])<.15
                if dist(a,b)>=12 and axis_aligned:raw.append((a,b))
                elif dist(a,b)>=1 and axis_aligned:
                    midpoint=fitz.Point((a[0]+b[0])/2,(a[1]+b[1])/2)
                    if not any(tr.contains(midpoint) for tr in text_grid[(math.floor(midpoint.x/16),math.floor(midpoint.y/16))]):raw.append((a,b))
                if dist(a,b)>=15 and drawing.get('width',0)>=.8 and drawing.get('dashes')=='[] 0':solid_segments.append((a,b))
            elif item[0]=='c':
                curves.append((tuple(item[1]),tuple(item[4]),[list(p) for p in item[1:]]))
    # CAD wire crossover humps bridge two line terminals; their curve interiors
    # never create a junction to a crossing wire.
    terminal_grid=collections.defaultdict(list)
    for a,b in raw:
        for p in [a,b]:terminal_grid[(round(p[0]),round(p[1]))].append(p)
    def joins_terminal(pt):
        gx,gy=round(pt[0]),round(pt[1])
        return any(dist(pt,p)<=.8 for dx in [-1,0,1] for dy in [-1,0,1] for p in terminal_grid[(gx+dx,gy+dy)])
    curve_evidence=[]
    for a,b,control in curves:
        if joins_terminal(a) and joins_terminal(b) and dist(a,b)>1:
            raw.append((a,b));curve_evidence.append({'start':list(a),'end':list(b),'controlPoints':control})
    # Equipment outlines may be four separate CAD strokes rather than qu/re.
    horizontals=[(min(a[0],b[0]),max(a[0],b[0]),a[1]) for a,b in solid_segments if abs(a[1]-b[1])<.15]
    verticals=[(a[0],min(a[1],b[1]),max(a[1],b[1])) for a,b in solid_segments if abs(a[0]-b[0])<.15]
    for x0,x1,y0 in horizontals:
        for bx0,bx1,y1 in horizontals:
            if y1<=y0+15 or abs(x0-bx0)>.8 or abs(x1-bx1)>.8:continue
            if all(any(abs(vx-x)<.8 and abs(vy0-y0)<.8 and abs(vy1-y1)<.8 for vx,vy0,vy1 in verticals) for x in [x0,x1]):
                r=fitz.Rect(x0,y0,x1,y1);inside=[c for c in codes if r.contains((c['rect'].tl+c['rect'].br)/2)]
                if len({equipment(c['text']) for c in inside})==1:frames.append((r,inside[0]))
    # Keep the smallest unique-code enclosure for each printed equipment occurrence.
    selected={}
    for r,c in frames:
        key=tuple(c['rect'])
        if key not in selected or r.get_area()<selected[key][0].get_area():selected[key]=(r,c)
    frames=list(selected.values())
    def on_boundary(pt,r,tol=.8):
        x,y=pt
        return ((abs(x-r.x0)<=tol or abs(x-r.x1)<=tol) and r.y0-tol<=y<=r.y1+tol) or ((abs(y-r.y0)<=tol or abs(y-r.y1)<=tol) and r.x0-tol<=x<=r.x1+tol)
    segments=[]
    for a,b in raw:
        if any(on_boundary(a,r) and on_boundary(b,r) and (abs(a[0]-b[0])<.15 and (abs(a[0]-r.x0)<.8 or abs(a[0]-r.x1)<.8) or abs(a[1]-b[1])<.15 and (abs(a[1]-r.y0)<.8 or abs(a[1]-r.y1)<.8)) for r,c in frames):continue
        segments.append((a,b))
    parent=list(range(len(segments)))
    def root(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    def union(i,j):parent[root(i)]=root(j)
    # Overlaid CAD underline strokes belong to the same collinear drawn path.
    # This does not connect transverse crossing lines.
    axis_groups=collections.defaultdict(list)
    for i,(a,b) in enumerate(segments):
        horizontal=abs(a[1]-b[1])<.15
        axis_groups[('h' if horizontal else 'v',round((a[1] if horizontal else a[0])*4))].append((min(a[0],b[0]) if horizontal else min(a[1],b[1]),max(a[0],b[0]) if horizontal else max(a[1],b[1]),i))
    for group in axis_groups.values():
        group.sort(); active=None
        for start,end,i in group:
            if active is not None and start<=active[0]+.8:
                union(i,active[1]);active=(max(end,active[0]),active[1])
            else:active=(end,i)
    grid=collections.defaultdict(list)
    for i,(a,b) in enumerate(segments):
        for pt in [a,b]:
            gx,gy=round(pt[0]),round(pt[1])
            for dx in [-1,0,1]:
                for dy in [-1,0,1]:
                    for j,p in grid[(gx+dx,gy+dy)]:
                        if dist(pt,p)<=.8:union(i,j)
            grid[(gx,gy)].append((i,pt))
    components=collections.defaultdict(list)
    for i,s in enumerate(segments):components[root(i)].append(s)
    component_marks=collections.defaultdict(list)
    for cable in cables:
        r=cable['rect'];cx=(r.x0+r.x1)/2;cy=(r.y0+r.y1)/2
        matching=[]
        for key,segs in components.items():
            for a,b in segs:
                horizontal=abs(a[1]-b[1])<.15
                if horizontal and min(a[0],b[0])<=cx<=max(a[0],b[0]) and r.y0-1<=a[1]<=r.y1+max(3,r.height*.8):matching.append((abs(a[1]-r.y1),key))
                if not horizontal and min(a[1],b[1])<=cy<=max(a[1],b[1]) and r.x0-3<=a[0]<=r.x1+3:matching.append((abs(a[0]-cx),key))
        if matching:
            best=min(x[0] for x in matching)
            keys={k for score,k in matching if abs(score-best)<.5}
            if len(keys)==1:component_marks[next(iter(keys))].append(cable)
    associated=0
    for key,cs in component_marks.items():
        if len({norm(c['text']) for c in cs})!=1:continue
        segs=components[key]
        # Supply drawings label the exposed source terminal with circuit number
        # and the CSDB identity beside it, instead of an equipment rectangle.
        supplies=[c for c in codes if re.fullmatch(r'324\s*CSDB\s*\d+-\d+',descriptions.get(equipment(c['text']),''),re.I)]
        power_ports=[t for t in texts if re.fullmatch(r'\d{3}\s*\(.*(?:V|UPS).*\)',t['text'],re.I)]
        for a,b in segs:
            for pt in [a,b]:
                for terminal in power_ports:
                    pr=terminal['rect'];expanded=fitz.Rect(pr.x0-2,pr.y0-2,pr.x1+2,pr.y1+5)
                    if not expanded.contains(fitz.Point(pt)):continue
                    matching=[c for c in supplies if c['rect'].x0<=pr.x1 and c['rect'].x1>=pr.x0 and abs(c['rect'].y0-pr.y0)<25]
                    if len({equipment(c['text']) for c in matching})!=1:continue
                    code=matching[0];cable=cs[0];position=re.match(r'\d{3}',terminal['text']).group()
                    evidence={'page':page.number+1,'cable':{'text':cable['text'],'box':box(cable['rect'])},'equipment':{'text':code.get('rawText',code['text']),'box':box(code['rect'])},'equipmentMatch':'catalogue_description','port':{'text':position,'box':box(pr)},'path':{'method':'power-terminal-path-v1','points':[{'x':p[0],'y':p[1]} for s in segs for p in s]},'contact':list(pt),'sourceTerminalLabel':terminal['text'],'sourceEquipmentAlias':descriptions[equipment(code['text'])]}
                    findings[(norm(cable['text']),equipment(code['text']))].append((position,evidence));associated+=1
        for r,code in frames:
            contacts=[]
            for a,b in segs:
                for pt,other in [(a,b),(b,a)]:
                    if on_boundary(pt,r) and not r.contains(fitz.Point(other)):contacts.append(pt)
            for pt in contacts:
                aligned=[]
                for port in ports:
                    pr=port['rect'];center=((pr.x0+pr.x1)/2,(pr.y0+pr.y1)/2)
                    inside=r.contains(fitz.Point(center))
                    exterior=fitz.Rect(r.x0-10,r.y0-10,r.x1+10,r.y1+10).contains(fitz.Point(center))
                    if not inside and (not exterior or any(other_r!=r and other_r.contains(fitz.Point(center)) for other_r,other_code in frames)):continue
                    side=abs(pt[0]-r.x0)<.8 or abs(pt[0]-r.x1)<.8
                    if side and pr.y0-1<=pt[1]<=pr.y1+1 and abs(center[0]-pt[0])<=max(25,pr.width+8):aligned.append(port)
                    elif not side and pr.x0-1<=pt[0]<=pr.x1+1 and abs(center[1]-pt[1])<=max(20,pr.height+8):aligned.append(port)
                unique={p['text']:p for p in aligned}
                if not unique:
                    side=abs(pt[0]-r.x0)<.8 or abs(pt[0]-r.x1)<.8
                    # Inspect ALL native text, not just recognised port names.
                    # Any visible text in the interior contact band prevents
                    # certification as a direct, unlabelled source terminal.
                    if side:
                        strip=fitz.Rect(r.x0-10,pt[1]-4,min(r.x1,r.x0+30),pt[1]+4) if abs(pt[0]-r.x0)<.8 else fitz.Rect(max(r.x0,r.x1-30),pt[1]-4,r.x1+10,pt[1]+4)
                    else:
                        strip=fitz.Rect(pt[0]-4,r.y0-10,pt[0]+4,min(r.y1,r.y0+25)) if abs(pt[1]-r.y0)<.8 else fitz.Rect(pt[0]-4,max(r.y0,r.y1-25),pt[0]+4,r.y1+10)
                    if any(nr.intersects(strip) for nr in unclassified_glyph_boxes):continue
                    cable=cs[0]
                    evidence={'page':page.number+1,'cable':{'text':cable['text'],'box':box(cable['rect'])},'equipment':{'text':code['text'],'box':box(code['rect'])},'port':None,'path':{'method':'vector-direct-terminal-v1','points':[{'x':p[0],'y':p[1]} for segment in segs for p in segment]},'equipmentFrame':box(r),'contact':{'x':pt[0],'y':pt[1]},'unlabelledTerminal':True}
                    evidence['contactTextStrip']=box(strip)
                    evidence['equipmentAnnotations']=[{'text':t['text'],'box':box(t['rect'])} for t in texts if norm(t['text']) in description_whitelist and t['rect'].intersects(strip)]
                    raw_code=code.get('rawText',code['text'])
                    if equipment(raw_code)!=equipment(code['text']):evidence['equipment']['text']=raw_code;evidence['equipmentMatch']='catalogue_description'
                    findings[(norm(cable['text']),equipment(code['text']))].append((None,evidence));associated+=1
                    continue
                if len(unique)!=1:continue
                port=next(iter(unique.values()));cable=cs[0]
                evidence={'page':page.number+1,'cable':{'text':cable['text'],'box':box(cable['rect'])},'equipment':{'text':code['text'],'box':box(code['rect'])},'port':{'text':port['text'],'box':box(port['rect'])},'path':{'method':'vector-terminal-frame-v1','points':[{'x':pt[0],'y':pt[1]} for segment in segs for pt in segment]},'equipmentFrame':box(r),'contact':list(pt)}
                raw_code=code.get('rawText',code['text'])
                if equipment(raw_code)!=equipment(code['text']):
                    evidence['equipment']['text']=raw_code;evidence['equipmentMatch']='catalogue_description'
                findings[(norm(cable['text']),equipment(code['text']))].append((port['text'],evidence));associated+=1
    page_audits.append({'page':page.number+1,'frames':len(frames),'frameEquipmentCodes':[equipment(c['text']) for r,c in frames],'uniquelyTracedMarks':[norm(cs[0]['text']) for cs in component_marks.values() if len({norm(c['text']) for c in cs})==1],'segments':len(segments),'curveBridges':len(curve_evidence),'curveEvidence':curve_evidence,'cableTexts':len(cables),'associations':associated})
resolutions=[]
for endpoint in catalogue['endpoints']:
    matches=findings.get((norm(endpoint['cableMark']),equipment(endpoint['equipmentCode'])),[])
    # A repeated schematic reference without a label does not contradict a
    # precise connector printed at another occurrence of the same endpoint.
    if any(p is not None for p,e in matches):matches=[(p,e) for p,e in matches if p is not None]
    positions={p for p,e in matches}
    position=next(iter(positions)) if len(positions)==1 else None
    status='unresolved' if not matches else 'ambiguous' if len(positions)>1 else 'direct' if position is None else 'explicit_source_tbd' if position.upper()=='TBD' else 'resolved'
    resolutions.append({'endpointId':endpoint['id'],'cableMark':endpoint['cableMark'],'equipmentCode':endpoint['equipmentCode'],'position':position,'status':status,'evidence':[e for p,e in matches],'reason':None if matches else 'No unique cable path, drawn equipment frame and aligned port chain found; no TBD inferred'})
counts=dict(collections.Counter(r['status'] for r in resolutions))
packet={'schema':'core.targhetti.resolution.v1','documentSha256':sha,'extractorVersion':'vector-terminal-frame-v1','policyVersion':'unique-path-frame-port-v1','resolutions':resolutions,'audit':{'counts':counts,'totalEndpoints':len(resolutions),'pages':page_audits,'limitations':['Only explicitly drawn unique-code equipment enclosures are certified','Crossing lines are not merged without endpoint junction','Missing extraction is unresolved, never TBD']}}
os.makedirs(os.path.dirname(os.path.abspath(output)),exist_ok=True)
with open(output,'w',encoding='utf-8') as f:json.dump(packet,f,ensure_ascii=False,separators=(',',':'),allow_nan=False)
print(json.dumps({'output':output,'counts':counts,'endpoints':len(resolutions)}))
`;

const args = process.argv.slice(2);
if (![5, 7].includes(args.length) || args[3] !== "--python" || (args.length === 7 && args[5] !== "--index")) {
  console.error("Usage: targhetti-pdf-resolve <source.pdf> <catalogue.json> <output.json> --python <python> [--index <text-index.json>]");
  process.exitCode = 1;
} else {
  const result = spawnSync(args[4], ["-c", program, ...args.slice(0, 3).map(p => resolve(p)), ...(args[6] ? [resolve(args[6])] : [])], { encoding: "utf8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) { console.error(result.error?.message ?? result.stderr); process.exitCode = 1; }
  else process.stdout.write(result.stdout);
}
