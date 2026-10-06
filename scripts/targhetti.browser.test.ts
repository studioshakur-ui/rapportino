// Headless UI verification uses isolated API fixtures, never real auth or writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { TarghettiCatalogue, TarghettiEvent } from "../src/modules/targhetti/targhetti.types";

const [root, pdfPath] = process.argv.slice(2);
if (!root || !pdfPath) throw new Error("Usage: browser test <artifact dir> <PDF>");
const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? "playwright";
const { chromium } = require(playwrightModule);
const owner = "11111111-1111-4111-8111-111111111111";
const bytes = readFileSync(`${root}/TARGHETTI.core.json`), catalogue = JSON.parse(bytes.toString()) as TarghettiCatalogue;
const user = { id: owner, aud: "authenticated", role: "authenticated", email: "test@example.invalid", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-06T00:00:00Z" };
const events: TarghettiEvent[] = Array.from({length:1001},(_,i)=>({id:`rejected-${String(i).padStart(4,"0")}`,event_type:"targhetti.positions",validation_status:"rejected",created_at:"2026-10-06T00:00:00Z",validated_at:null,validated_by:null,payload:{owner_id:owner,catalogueId:catalogue.id,changes:[]}}));
events.push({id:"source-import",event_type:"targhetti.import",validation_status:"pending",created_at:"2026-10-06T01:00:00Z",validated_at:null,validated_by:null,payload:{owner_id:owner,catalogueId:catalogue.id,cataloguePath:`targhetti/${owner}/fixture/catalogue.json`,pdfPath:`targhetti/${owner}/fixture/source.pdf`,excelPath:`targhetti/${owner}/fixture/source.xlsx`,pdfName:catalogue.pdf.name,excelName:catalogue.excel.name,endpointCount:catalogue.endpoints.length,pageCount:56}});

async function main() {
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM});
  try {
  const context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
  const ranges:number[]=[];const errors:string[]=[];
  await context.addInitScript(({user,owner}:{user:unknown;owner:string})=>localStorage.setItem("cncs-auth",JSON.stringify({access_token:`eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+7200,role:"authenticated"}))}.fixture`,refresh_token:"fixture",expires_at:Math.floor(Date.now()/1000)+7200,expires_in:7200,token_type:"bearer",user})),{user,owner});
  await context.route("https://*.supabase.co/**",async (route: any)=>{
    const request=route.request(),url=new URL(request.url()),method=request.method();
    const reply=async(body:unknown)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
    if(url.pathname.endsWith("/auth/v1/user"))return reply(user);
    if(url.pathname.includes("/rest/v1/profiles"))return reply(request.headers().accept?.includes("object")?{id:owner,is_core_owner:true,first_name:"Hamidou"}:[{id:owner,is_core_owner:true,first_name:"Hamidou"}]);
    if(url.pathname.endsWith("/rpc/core_command_is_owner"))return reply(true);
    if(url.pathname.includes("/storage/v1/object/") && url.pathname.endsWith("catalogue.json"))return route.fulfill({status:200,contentType:"application/json",body:bytes});
    if(url.pathname.includes("/storage/v1/object/") && url.pathname.endsWith("source.pdf"))return route.fulfill({status:200,contentType:"application/pdf",body:readFileSync(pdfPath)});
    if(url.pathname.includes("/rest/v1/core_events")){
      const id=url.searchParams.get("id")?.replace(/^eq\./,"");
      if(method==="POST"){
        const raw=request.postDataJSON();const event={...raw,id:randomUUID(),created_at:new Date().toISOString(),validated_at:null,validated_by:null};events.push(event);return reply(event);
      }
      if(method==="PATCH"){
        const event=events.find(e=>e.id===id);assert(event);Object.assign(event,request.postDataJSON());return reply(event);
      }
      if(id)return reply(events.find(e=>e.id===id));
      const offset=Number(url.searchParams.get("offset")??0),limit=Number(url.searchParams.get("limit")??500);ranges.push(offset);return reply(events.slice(offset,offset+limit));
    }
    return reply([]);
  });
  const page=await context.newPage();page.on("pageerror",(e:Error)=>errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/command/targhetti");
  await page.getByRole("heading",{name:"TARGHETTI",exact:true}).waitFor();
  await page.getByRole("button",{name:"Conferma",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Fascicolo confermato"}).waitFor();
  assert(ranges.includes(500)&&ranges.includes(1000),"All event pages loaded");
  await page.getByRole("checkbox",{name:"Seleziona tutto",exact:true}).uncheck();
  await page.getByLabel("Cerca un cavo TARGHETTI").fill("C RC 002");
  await page.getByRole("checkbox",{name:"Seleziona C RC 002",exact:true}).check();
  assert.equal(await page.getByLabel("Collegamento C RC 002",{exact:true}).inputValue(),"J2");
  assert(await page.getByRole("button",{name:"Esporta i 2 fogli Excel",exact:true}).isDisabled());
  await page.getByRole("button",{name:"Conferma collegamenti (1)",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Confermati: 1."}).waitFor();
  assert.equal(await page.getByLabel("Collegamento C RC 002",{exact:true}).getAttribute("title"),"Confermato");
  await page.getByText("C RC 002 - J2",{exact:true}).waitFor();
  // An unconfirmed edit must block exports of the previous confirmed position.
  await page.getByLabel("Collegamento C RC 002",{exact:true}).fill("J5");
  assert(await page.getByRole("button",{name:"Esporta i 2 fogli Excel",exact:true}).isDisabled());
  await page.getByText("C RC 002 - J5",{exact:true}).waitFor();
  await page.getByLabel("Collegamento C RC 002",{exact:true}).fill("J2");
  const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Esporta i 2 fogli Excel",exact:true}).click();
  const download=await downloadPromise;await download.saveAs(`${root}/CORE_TARGHETTI_test.xlsx`);
  const book=XLSX.readFile(`${root}/CORE_TARGHETTI_test.xlsx`);
  assert.deepEqual(book.SheetNames,["411005010001_MET","411005010001_INT"]);
  assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1}),[["C RC 002"]]);
  assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[1]],{header:1}),[["C RC 002 - J2"]]);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${root}/CORE_TARGHETTI_desktop.png`,fullPage:true});
  await page.getByRole("button",{name:"PDF C RC 002",exact:true}).click();
  await page.getByText("Caricamento del disegno…",{exact:true}).waitFor({state:"hidden",timeout:60000});
  await page.waitForFunction(()=>{const c=document.querySelector(".tg-diagram-scroll canvas") as HTMLCanvasElement;return Boolean(c?.width>100);});
  assert.equal(await page.getByLabel("Pagina PDF",{exact:true}).inputValue(),"3");
  await page.getByText("Dettagli del cavo (95 campi)",{exact:true}).click();
  assert.equal(await page.locator(".tg-details dt").count(),95);
  const ink=await page.locator("canvas").evaluate((c:HTMLCanvasElement)=>{const d=c.getContext("2d")!.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=400)if(d[i]<180&&d[i+3])n++;return n;});assert(ink>100,"Original drawing actually rendered");
  await page.getByRole("button",{name:"Chiudi il PDF",exact:true}).click();
  await page.getByLabel("Cerca un apparecchio").fill("415001120001");
  await page.getByRole("button",{name:/^Scegli 415001120001 /}).click();
  await page.getByRole("checkbox",{name:"Seleziona tutto",exact:true}).uncheck();
  await page.getByLabel("Cerca un cavo TARGHETTI").fill("C RC 002");
  await page.getByRole("checkbox",{name:"Seleziona C RC 002",exact:true}).check();
  assert.notEqual(await page.getByLabel("Collegamento C RC 002",{exact:true}).inputValue(),"J2");
  assert(await page.getByRole("button",{name:"Esporta i 2 fogli Excel",exact:true}).isDisabled(),"Opposite end cannot reuse the approved J2");
  assert(await page.getByRole("button",{name:"Esporta metalliche",exact:true}).isEnabled());
  await page.getByText("Stampa",{exact:true}).click();
  await page.getByRole("button",{name:"Registra metalliche stampate",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Stampa registrata."}).waitFor();
  await page.getByRole("button",{name:"Strumenti",exact:true}).click();
  await page.getByText("Esportazione per tutti gli apparecchi",{exact:true}).click();
  const allDownloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Esporta tutte le metalliche",exact:true}).click();
  const allDownload=await allDownloadPromise;await allDownload.saveAs(`${root}/CORE_TARGHETTI_TOUS_test.xlsx`);
  const allBook=XLSX.readFile(`${root}/CORE_TARGHETTI_TOUS_test.xlsx`);
  assert.equal(allBook.SheetNames.length,870);
  const allLabels=allBook.SheetNames.flatMap(name=>XLSX.utils.sheet_to_json(allBook.Sheets[name],{header:1}) as string[][]).map(row=>row[0]);
  assert.equal(allLabels.length,3752);
  assert.deepEqual([...allLabels].sort(),catalogue.endpoints.filter(e=>!e.cableMark.includes("*")).map(e=>e.cableMark).sort());
  await page.getByRole("button",{name:"Torna alla preparazione",exact:true}).click();
  for(const width of [736,390,320]){
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}px`);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`${root}/CORE_TARGHETTI_${width}.png`});
  }
  await page.getByRole("button",{name:"Strumenti",exact:true}).click();
  await page.getByText("Cerca nel PDF · 56 pages",{exact:true}).click();
  await page.getByLabel("Cerca nel PDF").fill("R SR 101");
  await page.getByRole("button",{name:/^Pagina 42/}).waitFor();
  await page.getByText("Aggiungi un cavo presente solo nel PDF",{exact:true}).click();
  await page.getByLabel("Marca cavo esatta",{exact:true}).fill("PDF TEST 001");
  await page.getByLabel("Apparecchio di partenza",{exact:true}).fill("461001010001");
  await page.getByLabel("Apparecchio di arrivo",{exact:true}).fill("411005010001");
  await page.getByLabel("Collegamento di partenza",{exact:true}).fill("PP3 J1-J2");
  await page.getByLabel("Collegamento di arrivo",{exact:true}).fill("J15");
  await page.getByLabel("Pagina di riferimento del cavo aggiunto",{exact:true}).fill("3");
  await page.getByRole("button",{name:"Proponi questo cavo",exact:true}).click();
  await page.getByText(/2 estremità da aggiungere/).waitFor();
  await page.getByText("2 estremità da aggiungere",{exact:true}).click();
  await page.getByRole("button",{name:"Conferma queste righe",exact:true}).click();
  await page.getByRole("button",{name:"Torna alla preparazione",exact:true}).click();
  await page.getByLabel("Cerca un apparecchio").fill("461001010001");
  await page.getByRole("button",{name:/^Scegli 461001010001 /}).click();
  assert.equal(await page.getByLabel("Collegamento PDF TEST 001",{exact:true}).inputValue(),"PP3 J1-J2");
  assert(await page.getByRole("button",{name:"Esporta i 2 fogli Excel",exact:true}).isEnabled());
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("UI TARGHETTI : pagination >1000 événements, validation, deux feuilles XLSX, dessin PDF, 95 champs, extrémités indépendantes, stampa et écrans 1440/736/390/320 OK.");
  } finally { await browser.close(); }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
