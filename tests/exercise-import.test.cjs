const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML,DOMParser,HTMLInputElement}=require('linkedom');
const {webcrypto}=require('node:crypto');

Object.defineProperty(HTMLInputElement.prototype,'checked',{
  get(){return this.hasAttribute('checked');},
  set(value){this.toggleAttribute('checked',Boolean(value));},configurable:true
});

async function app(){
  const {document}=parseHTML('<html><head></head><body></body></html>');
  const state={rows:[],uploads:[],removed:[],alerts:[],events:{},failUpload:0,failInsert:false};
  const client={auth:{getUser:async()=>({data:{user:{id:'test-owner'}}})},
    from:()=>({select:()=>({order:async()=>({data:state.rows,error:null})}),
      insert:async row=>{if(state.failInsert)return {error:new Error('insert failed')};state.rows.push({...row,id:String(state.rows.length+1)});return {error:null};},
      update:row=>({eq:async(_,id)=>{Object.assign(state.rows.find(x=>x.id===id),row);return {error:null};}}),
      delete:()=>({eq:async(_,id)=>{state.rows=state.rows.filter(x=>x.id!==id);return {error:null};}})}),
    storage:{from:()=>({upload:async(p,file)=>{if(state.failUpload===state.uploads.length+1)return {error:new Error('upload failed')};state.uploads.push(p);return {error:null};},
      remove:async paths=>{state.removed.push(...paths);return {error:null};},createSignedUrl:async p=>({data:{signedUrl:'https://example.test/'+p}})})}};
  const ctx={document,URL,DOMParser,XMLSerializer:class{serializeToString(node){return node.toString();}},crypto:webcrypto,AbortController,setTimeout,clearTimeout,console:{error(){},warn(){}},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    addEventListener:(name,fn)=>(state.events[name]??=[]).push(fn),
    dispatchEvent:event=>(state.events[event.type]||[]).forEach(fn=>fn(event)),
    modal:html=>{document.body.insertAdjacentHTML('beforeend','<div id="m">'+html+'</div>');},
    closeM:()=>document.getElementById('m')?.remove(),alert:msg=>state.alerts.push(msg),confirm:()=>true,
    fetch:async()=>{throw new Error('CORS');},Tesseract:{recognize:async()=>({data:{text:'Titolo: Conduzione\nObiettivo: Controllo palla\nMateriale: Palloni\nNote: Cambiare piede'}})}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const file of ['exercise-import-utils.js','exercises-sync.js','exercise-import.js','exercise-mobile-fixes.js','exercise-admin.js']){
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
  }
  await Promise.all(state.events['osgb-auth-ready'].map(fn=>fn({detail:{client}})));
  await Promise.resolve();
  const value=(id,value)=>{document.getElementById(id).value=value;};
  const images=(...names)=>ctx.previewExerciseImage({files:names.map(name=>new File(['test'],name,{type:'image/png'})),value:''});
  return {ctx,state,document,value,images};
}

test('Instagram URL validation accepts posts/reels and removes tracking',async()=>{
  const {ctx}=await app(),parse=ctx.osgbExerciseImport.instagramUrl;
  assert.equal(parse('https://m.instagram.com/reels/Ab_c-1/?igsh=test#x'),'https://www.instagram.com/reel/Ab_c-1/');
  for(const url of ['javascript:alert(1)','https://instagram.com.evil.test/p/x/','https://instagram.com@evil.test/p/x/','https://www.instagram.com/accounts/login/','https://www.instagram.com/profile/','http://instagram.com/p/x/','https://user:pass@instagram.com/p/x/','https://instagram.com:444/p/x/'])assert.throws(()=>parse(url));
});

test('structured OCR separates fields and preserves multiline notes/variants',async()=>{
  const {ctx}=await app();
  const d=ctx.osgbExerciseImport.parseText('Titolo: Le porte\nObiettivo: Conduzione\nMateriale: 6 cinesini\nDescrizione: Attraversare le porte.\nTornare al via.\nVarianti: Piede debole\nNote: Cambio ogni minuto\nDue turni\nDurata: 12 min');
  assert.equal(d.title,'Le porte');assert.equal(d.objective,'Conduzione');assert.equal(d.equipment,'6 cinesini');assert.equal(d.duration,'12');assert.equal(d.description,'Attraversare le porte.\nTornare al via.');assert.equal(d.notes,'Cambio ogni minuto\nDue turni');
  const single='Esercizio di conduzione con passaggio finale al compagno.';assert.equal(ctx.osgbExerciseImport.parseText(single).description,single);
});

test('readable Instagram link creates and saves a draft without an image',async()=>{
  const {ctx,state,document,value}=await app();
  ctx.fetch=async()=>({ok:true,text:async()=>'<html><head><meta property="og:description" content="12 likes, coach on September 20: &quot;Le porte&#10;Obiettivo: Conduzione&#10;Materiale: Cinesini&#10;Note: Due turni&quot;"></head></html>'});
  ctx.importExerciseInstagram();ctx.importInstagramLink();value('instagramSourceUrl','https://www.instagram.com/p/ABC/?igsh=tracking');await ctx.readInstagramLink();
  assert.equal(document.getElementById('impTitle').value,'Le porte');value('impNotes','Nota corretta');await ctx.saveImportedExercise();
  assert.equal(state.rows.length,1);assert.equal(state.rows[0].source_type,'instagram');assert.equal(state.rows[0].source_url,'https://www.instagram.com/p/ABC/');assert.equal(state.rows[0].notes,'Nota corretta');assert.equal(state.rows[0].source_image_path,null);assert.equal(state.uploads.length,0);assert.equal(ctx.__exerciseFilter,'instagram');
});

test('blocked or login-only link retains the fallback and creates no empty draft',async()=>{
  const {ctx,document,value,state}=await app();
  ctx.importExerciseInstagram();ctx.importInstagramLink();value('instagramSourceUrl','https://instagram.com/reel/ABC/');await ctx.readInstagramLink();
  assert.match(document.getElementById('instagramImportStatus').textContent,/Carica gli screenshot/);assert.equal(document.getElementById('impTitle'),null);
  ctx.fetch=async()=>({ok:true,text:async()=>'<meta name="description" content="Log in to Instagram">'});await ctx.readInstagramLink();assert.equal(document.getElementById('impTitle'),null);
  value('instagramSourceText','Titolo: Esercizio dal testo\nNote: Prova');ctx.prepareInstagramTextDraft();await ctx.saveImportedExercise();assert.equal(state.rows[0].source_type,'instagram');
});

test('multiple screenshots are transcribed, saved, displayed and removed together',async()=>{
  const {ctx,state,document,images}=await app();let calls=0;
  ctx.Tesseract.recognize=async()=>({data:{text:++calls===1?'Titolo: Conduzione\nDescrizione: Attraversa il campo':'Materiale: Coni\nNote: Due turni'}});
  ctx.importExerciseInstagram();ctx.importInstagramScreenshots();images('post.png','caption.png');await ctx.runExerciseOcr();await ctx.saveImportedExercise();
  const row=state.rows[0];assert.equal(calls,2);assert.equal(row.source_images.length,2);assert.equal(state.uploads.length,2);assert.match(row.source_ocr_text,/Due turni/);assert.equal(row.notes,'Due turni');
  await ctx.openExerciseDetail(row.id);assert.equal(document.querySelectorAll('.exercise-source-image').length,2);assert.match(document.body.textContent,/Testo trascritto/);
  await ctx.deleteExerciseAdmin(row.id);assert.equal(state.rows.length,0);assert.equal(new Set(state.removed).size,2);
});

test('save options and edited fields survive the diagram round trip',async()=>{
  const {ctx,state,document,value,images}=await app();
  ctx.importExerciseInstagram();ctx.importInstagramScreenshots();images('post.png');await ctx.runExerciseOcr();
  value('impVariants','Variante modificata');value('impNotes','Nota modificata');value('impTranscript','Trascrizione corretta');document.getElementById('impSaveImages').checked=false;document.getElementById('impSaveText').checked=false;
  ctx.openDiagramEditor();ctx.backToExerciseDraft();
  assert.equal(document.getElementById('impVariants').value,'Variante modificata');assert.equal(document.getElementById('impNotes').value,'Nota modificata');assert.equal(document.getElementById('impTranscript').value,'Trascrizione corretta');assert.equal(document.getElementById('impSaveImages').checked,false);
  await ctx.saveImportedExercise();assert.equal(state.uploads.length,0);assert.equal(state.rows[0].source_ocr_text,null);assert.equal(state.rows[0].source_type,'instagram');assert.match(state.rows[0].diagram_svg,/saved-diagram/);
});

test('OCR failure still allows a manual draft and optional original image',async()=>{
  const {ctx,state,document,images}=await app();ctx.Tesseract.recognize=async()=>{throw new Error('offline');};
  ctx.importExerciseInstagram();ctx.importInstagramScreenshots();images('frame.png');await ctx.runExerciseOcr();assert.match(document.body.textContent,/Trascrizione non completata/);await ctx.saveImportedExercise();assert.equal(state.rows.length,1);assert.equal(state.rows[0].source_images.length,1);
});

test('database and partial upload failures clean up only this attempt and preserve draft',async()=>{
  for(const mode of ['insert','upload']){
    const {ctx,state,document,images}=await app();ctx.importExerciseInstagram();ctx.importInstagramScreenshots();images('1.png','2.png');await ctx.runExerciseOcr();
    if(mode==='insert')state.failInsert=true;else state.failUpload=2;
    await ctx.saveImportedExercise();assert.equal(state.rows.length,0);assert.equal(state.removed.length,mode==='insert'?2:1);assert.ok(document.getElementById('impTitle'));assert.equal(document.getElementById('saveImportedExerciseBtn').disabled,false);
  }
});

test('new import clears previous URL, transcript and diagram',async()=>{
  const {ctx,state,value,images}=await app();ctx.importExerciseInstagram();ctx.importInstagramLink();value('instagramSourceUrl','https://instagram.com/p/ABC/');value('instagramSourceText','Primo\nDescrizione precedente');ctx.prepareInstagramTextDraft();ctx.__diagramSvg='<svg></svg>';
  ctx.importExerciseImage();images('new.png');ctx.prepareImageDraftManually();await ctx.saveImportedExercise();assert.equal(state.rows[0].source_type,'image');assert.equal(state.rows[0].source_url,null);assert.equal(state.rows[0].source_ocr_text,null);assert.equal(state.rows[0].diagram_svg,null);
});

test('stale link responses do not replace a new image import',async()=>{
  const {ctx,document,value}=await app();let finish;
  ctx.fetch=()=>new Promise(resolve=>{finish=resolve;});ctx.importExerciseInstagram();ctx.importInstagramLink();value('instagramSourceUrl','https://instagram.com/p/ABC/');const pending=ctx.readInstagramLink();ctx.importExerciseImage();finish({ok:true,text:async()=>'<meta property="og:description" content="Esercizio">'});await pending;
  assert.ok(document.getElementById('imgExerciseFile'));assert.equal(document.getElementById('impTitle'),null);
});

test('archive filters include Instagram in requested order and do not classify it as manual',async()=>{
  const {ctx,state,document}=await app();state.rows=Object.keys(ctx.osgbExerciseImport.labels).map((source_type,id)=>({id:String(id),title:source_type,source_type}));await ctx.osgbReloadExercises();ctx.exercises();
  const text=document.body.textContent;assert.ok(text.indexOf('📷 Immagini ·')<text.indexOf('🌐 Web ·'));assert.ok(text.indexOf('🌐 Web ·')<text.indexOf('📱 Instagram ·'));assert.ok(text.indexOf('📱 Instagram ·')<text.indexOf('✍️ Manuali ·'));
  ctx.exercises('instagram');assert.equal(document.querySelectorAll('.card').length,1);assert.match(document.querySelector('.card').textContent,/instagram/);assert.equal(document.querySelectorAll('#m').length,1);
});

test('invalid files are rejected and simultaneous saves insert only once',async()=>{
  const {ctx,state,document,images}=await app();ctx.importExerciseInstagram();ctx.importInstagramScreenshots();images('1.png','2.png','3.png','4.png','5.png','6.png');assert.match(state.alerts.pop(),/massimo 5/);
  ctx.previewExerciseImage({files:[new File(['test'],'bad.svg',{type:'image/svg+xml'})],value:''});assert.match(state.alerts.pop(),/JPG/);
  images('ok.png');await ctx.runExerciseOcr();await Promise.all([ctx.saveImportedExercise(),ctx.saveImportedExercise()]);assert.equal(state.rows.length,1);
});
