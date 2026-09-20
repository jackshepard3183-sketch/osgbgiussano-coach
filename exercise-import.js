(function(){
  let client=null,user=null,currentFile=null,currentFiles=[],currentOcr='',diagramItems=[],arrowStart=null;
  let importSource='image',sourceUrl='',previewUrls=[],ocrLoading=null,pdfLoading=null,pdfDrafts=[],pdfDraftIndex=0,operation=0,saving=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safe=s=>String(s||'file').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'file';
  const textVal=id=>document.getElementById(id)?.value.trim()||'';
  const checked=id=>document.getElementById(id)?.checked!==false;
  const parseText=text=>window.osgbExerciseImport.parseText(text);
  const MAX_FILES=5;

  function clearPreviews(){previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls=[];}
  function previewUrl(file){const url=URL.createObjectURL(file);previewUrls.push(url);return url;}
  function resetImport(source){
    operation++;clearPreviews();currentFile=null;currentFiles=[];currentOcr='';sourceUrl='';importSource=source;
    pdfDrafts=[];pdfDraftIndex=0;diagramItems=[];arrowStart=null;window.__diagramSvg=null;window.__exerciseDraft=null;
  }
  function ensureTesseract(){
    if(window.Tesseract)return Promise.resolve();
    if(ocrLoading)return ocrLoading;
    ocrLoading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.async=true;
      s.onload=resolve;s.onerror=()=>{s.remove();ocrLoading=null;reject(new Error('OCR non disponibile'));};document.head.appendChild(s);
    });
    return ocrLoading;
  }
  function ensurePdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    if(pdfLoading)return pdfLoading;
    pdfLoading=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.async=true;
      s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(window.pdfjsLib);};
      s.onerror=()=>{s.remove();pdfLoading=null;reject(new Error('Lettore PDF non disponibile'));};document.head.appendChild(s);
    });
    return pdfLoading;
  }
  function showImageImport(){
    closeM();clearPreviews();
    const instagram=importSource==='instagram';
    modal(`<div class="mh"><h3>${instagram?'SCREENSHOT INSTAGRAM':'IMPORTA DA IMMAGINE'}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">${instagram?'Carica gli screenshot del post, del reel e della descrizione.':'Carica una foto o uno screenshot.'} Il testo viene trascritto nel browser e potrai correggerlo prima di salvare. Uno schema senza testo richiede una descrizione manuale.</p>
      ${instagram?'<p><span class="pill yellow">📱 Instagram</span></p><div class="field"><label for="instagramImageUrl">Link del post/reel (facoltativo)</label><input id="instagramImageUrl" type="url" placeholder="https://www.instagram.com/reel/.../" value="'+esc(sourceUrl)+'"></div>':''}
      <div class="field"><label for="imgExerciseFile">${instagram?'Screenshot (fino a 5)':'Immagine'}</label><input id="imgExerciseFile" type="file" accept="image/jpeg,image/png,image/webp" ${instagram?'multiple':''} onchange="previewExerciseImage(this)"><small class="muted">JPG, PNG o WEBP · massimo 5 MB per immagine.</small></div>
      <div id="imgExercisePreview"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn yellow" id="ocrExerciseBtn" onclick="runExerciseOcr()"><i data-lucide="scan-text"></i>Trascrivi ${instagram?'screenshot':'immagine'}</button><button class="btn alt" id="manualImageDraftBtn" onclick="prepareImageDraftManually()">Compila bozza manualmente</button></div>
      <div id="ocrExerciseStatus" role="status" aria-live="polite" class="muted" style="margin-top:10px"></div>`);
  }
  window.importExerciseImage=function(){resetImport('image');showImageImport();};
  window.importExercisePdf=function(){
    resetImport('pdf');closeM();
    modal(`<div class="mh"><h3>IMPORTA DA PDF</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Carica una scheda o una raccolta di esercizi in PDF. Il testo di tutte le pagine verrà estratto nel browser e trasformato in una bozza modificabile.</p>
      <p><span class="pill yellow">📄 PDF</span></p>
      <div class="field"><label for="pdfExerciseFile">Documento PDF</label><input id="pdfExerciseFile" type="file" accept="application/pdf,.pdf" onchange="previewExercisePdf(this)"><small class="muted">Un PDF · massimo 30 MB. Se contiene più esercizi, verranno creati separatamente.</small></div>
      <div id="pdfExercisePreview"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn yellow" id="readExercisePdfBtn" onclick="readExercisePdf()"><i data-lucide="scan-text"></i>Leggi PDF e crea bozza</button><button class="btn alt" id="manualPdfDraftBtn" onclick="preparePdfDraftManually()">Compila bozza manualmente</button></div>
      <div id="pdfExerciseStatus" role="status" aria-live="polite" class="muted" style="margin-top:10px"></div>`);
  };
  window.previewExercisePdf=function(input){
    const file=input?.files?.[0];operation++;clearPreviews();currentFile=null;currentFiles=[];currentOcr='';
    const box=document.getElementById('pdfExercisePreview');if(box)box.innerHTML='';if(!file)return;
    if(file.type!=='application/pdf'||file.size>30*1024*1024){alert('Usa un file PDF entro 30 MB.');input.value='';return;}
    currentFile=file;currentFiles=[file];if(box)box.innerHTML=`<div class="card" style="margin:8px 0 12px"><b>${esc(file.name)}</b><p class="muted" style="margin-bottom:0">${Math.max(1,Math.round(file.size/1024))} KB</p></div>`;
  };
  function checkPdfSource(){if(!currentFile||currentFile.type!=='application/pdf'){alert('Seleziona prima un PDF.');return false;}return true;}
  function openPdfDraft(index){
    pdfDraftIndex=index;const item=pdfDrafts[index];if(!item)return;
    currentOcr=item.transcript;diagramItems=[];arrowStart=null;window.__diagramSvg=null;window.__exerciseDraft=null;
    const total=pdfDrafts.length,sourceName=importSource==='web'?'conversazione':'PDF',notice=total>1?`Riconosciuti ${total} esercizi nella ${sourceName}. Stai controllando l’esercizio ${index+1} di ${total}.`:item.notice||'';
    openExerciseImportDraft({...item.draft,transcript:item.transcript,notice});
  }
  window.preparePdfDraftManually=function(){if(checkPdfSource()){operation++;pdfDrafts=[{draft:parseText(currentOcr),transcript:currentOcr}];openPdfDraft(0);}};
  window.readExercisePdf=async function(){
    if(!checkPdfSource())return;
    const btn=document.getElementById('readExercisePdfBtn'),input=document.getElementById('pdfExerciseFile'),manual=document.getElementById('manualPdfDraftBtn'),status=document.getElementById('pdfExerciseStatus');
    const version=++operation,file=currentFile;
    try{
      if(btn)btn.disabled=true;if(input)input.disabled=true;if(manual)manual.disabled=true;if(status)status.textContent='Apertura PDF…';
      const pdfjs=await ensurePdfJs(),bytes=await file.arrayBuffer(),pdf=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise,texts=[];
      for(let n=1;n<=pdf.numPages;n++){
        if(version!==operation||!btn?.isConnected)return;
        if(status)status.textContent=`Lettura pagina ${n}/${pdf.numPages}…`;
        const page=await pdf.getPage(n),content=await page.getTextContent();
        const text=content.items.reduce((out,item)=>out+(item.str||'')+(item.hasEOL?'\n':' '),'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();if(text)texts.push(text);
      }
      if(version!==operation||!btn?.isConnected)return;
      currentOcr=texts.join('\n\n');
      const chunks=window.osgbExerciseImport.splitExercises(currentOcr,texts);
      pdfDrafts=(chunks.length?chunks:['']).map(chunk=>({draft:parseText(chunk),transcript:chunk,notice:chunk?'':'Il PDF non contiene testo selezionabile. Compila la bozza manualmente usando il documento come riferimento.'}));
      openPdfDraft(0);
    }catch(err){if(version!==operation||!btn?.isConnected)return;console.error(err);if(status)status.textContent='Non è stato possibile leggere il PDF. Puoi comunque compilare la bozza manualmente.';}
    finally{if(btn)btn.disabled=false;if(input)input.disabled=false;if(manual)manual.disabled=false;}
  };
  window.importExerciseInstagram=function(){
    resetImport('instagram');closeM();
    modal(`<div class="mh"><h3>IMPORTA DA INSTAGRAM</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Scegli come importare l’esercizio. Potrai controllare e modificare la bozza prima di salvarla nell’archivio.</p>
      <div class="grid g2"><button class="btn alt" onclick="importInstagramLink()"><i data-lucide="link"></i>Incolla link</button><button class="btn yellow" onclick="importInstagramScreenshots()"><i data-lucide="image-plus"></i>Carica screenshot</button></div>
      <p class="muted">Se Instagram non consente di leggere il link, usa gli screenshot oppure incolla la descrizione del post.</p>`);
  };
  window.importExerciseChatgpt=function(){
    resetImport('web');closeM();
    modal(`<div class="mh"><h3>IMPORTA DA CHATGPT</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Copia dalla conversazione la parte che contiene gli esercizi e incollala qui. L’app riconoscerà anche più esercizi nello stesso testo e te li farà controllare uno alla volta.</p><div class="field"><label for="chatgptSourceUrl">Link condiviso ChatGPT (facoltativo)</label><input id="chatgptSourceUrl" type="url" placeholder="https://chatgpt.com/share/..."><small class="muted">Il link viene conservato come fonte. Il testo va incollato sotto perché i link condivisi possono bloccare la lettura automatica.</small></div><div class="field"><label for="chatgptSourceText">Testo della conversazione</label><textarea id="chatgptSourceText" style="min-height:240px" placeholder="Incolla qui gli esercizi creati nella chat"></textarea></div><button class="btn" onclick="prepareChatgptExerciseDrafts()"><i data-lucide="sparkles"></i>Analizza e crea le bozze</button>`);
  };
  window.prepareChatgptExerciseDrafts=function(){
    const text=textVal('chatgptSourceText'),url=textVal('chatgptSourceUrl');if(!text){alert('Incolla il testo della conversazione.');return;}if(url&&!/^https:\/\/(?:www\.)?chatgpt\.com\/share\/[A-Za-z0-9_-]+(?:[/?#].*)?$/i.test(url)){alert('Inserisci un link condiviso ChatGPT valido oppure lascia il campo vuoto.');return;}
    operation++;sourceUrl=url;currentOcr=text;const chunks=window.osgbExerciseImport.splitExercises(text);pdfDrafts=(chunks.length?chunks:[text]).map(chunk=>({draft:parseText(chunk),transcript:chunk}));openPdfDraft(0);
  };
  window.importInstagramScreenshots=function(){
    const link=textVal('instagramSourceUrl');
    if(link){try{sourceUrl=window.osgbExerciseImport.instagramUrl(link);}catch(_){sourceUrl='';}}
    operation++;importSource='instagram';showImageImport();
  };
  window.importInstagramLink=function(){
    closeM();
    modal(`<div class="mh"><h3>INCOLLA LINK INSTAGRAM</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label for="instagramSourceUrl">Incolla link del post/reel</label><input id="instagramSourceUrl" type="url" placeholder="https://www.instagram.com/reel/.../" value="${esc(sourceUrl)}"></div>
      <button class="btn yellow" id="instagramReadBtn" onclick="readInstagramLink()"><i data-lucide="download"></i>Leggi link e crea bozza</button>
      <div id="instagramImportStatus" role="status" aria-live="polite" class="muted" style="margin-top:10px"></div>
      <div class="field"><label for="instagramSourceText">Descrizione del post (se il link non è leggibile)</label><textarea id="instagramSourceText" style="min-height:160px" placeholder="Incolla qui il testo dell’esercizio"></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="prepareInstagramTextDraft()">Crea bozza dal testo</button><button class="btn alt" onclick="importInstagramScreenshots()"><i data-lucide="image-plus"></i>Carica screenshot</button></div>`);
  };
  function linkValue(id,optional=false){const value=textVal(id);return optional&&!value?'':window.osgbExerciseImport.instagramUrl(value);}
  function instagramCaption(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const metadata=doc.querySelector('meta[property="og:description"]')?.content||doc.querySelector('meta[name="description"]')?.content||'';
    // Instagram commonly wraps captions in quotes after the author/date/like count.
    const quote=metadata.match(/:\s*["“]([\s\S]+)["”]\s*\.?$/);
    const caption=quote?quote[1]:metadata;
    if(!caption.trim()||/^(instagram|login\s*[•|–-]\s*instagram)$/i.test(caption.trim())||/^(?:log in|sign up|join instagram|create an account|accedi|iscriviti|crea un account|entra in instagram)\b/i.test(caption)||(!quote&&/see (?:instagram )?(?:photos|videos)|see what .+ (?:are|is) sharing|check out .+ on instagram|guarda (?:le foto|i video)|scopri .+ su instagram/i.test(caption))){throw new Error('Nessuna descrizione leggibile');}
    return caption.trim().slice(0,12000);
  }
  window.readInstagramLink=async function(){
    const status=document.getElementById('instagramImportStatus'),btn=document.getElementById('instagramReadBtn');
    let url;try{url=linkValue('instagramSourceUrl');}catch(e){if(status)status.textContent=e.message;return;}
    const version=++operation,controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    if(btn)btn.disabled=true;if(status)status.textContent='Lettura del post Instagram…';
    try{
      const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error('Contenuto non disponibile');
      const caption=instagramCaption(await response.text());
      if(version!==operation||!btn?.isConnected)return;
      // Keep the source tied to the content actually fetched, even if the input was edited meanwhile.
      sourceUrl=url;currentOcr=caption;openExerciseImportDraft(parseText(caption));
    }catch(_){if(version===operation&&status?.isConnected)status.textContent='Instagram non consente di leggere questo contenuto. Carica gli screenshot oppure incolla la descrizione qui sotto per creare la bozza.';}
    finally{clearTimeout(timeout);if(btn)btn.disabled=false;}
  };
  window.prepareInstagramTextDraft=function(){
    try{sourceUrl=linkValue('instagramSourceUrl');}catch(e){alert(e.message);return;}
    const text=textVal('instagramSourceText');if(!text){alert('Incolla la descrizione del post oppure carica uno screenshot.');return;}
    operation++;currentOcr=text;openExerciseImportDraft(parseText(text));
  };
  window.previewExerciseImage=function(input){
    const files=Array.from(input?.files||[]);if(!files.length)return;
    operation++;clearPreviews();currentFile=null;currentFiles=[];currentOcr='';
    const box=document.getElementById('imgExercisePreview');if(box)box.innerHTML='';
    if(files.length>(importSource==='instagram'?MAX_FILES:1)){alert('Puoi caricare al massimo '+MAX_FILES+' screenshot.');input.value='';return;}
    if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){
      alert('Usa immagini JPG, PNG o WEBP, ciascuna entro 5 MB.');input.value='';return;
    }
    currentFiles=files;currentFile=files[0];
    if(box)box.innerHTML=files.map((file,i)=>`<figure style="margin:8px 0 12px"><img src="${previewUrl(file)}" alt="Anteprima ${i+1}" style="display:block;width:100%;max-height:300px;object-fit:contain;border-radius:12px"><figcaption class="muted">${i+1}. ${esc(file.name)}</figcaption></figure>`).join('');
  };
  function checkImageSource(){
    if(!currentFiles.length){alert('Seleziona prima un’immagine.');return false;}
    if(importSource==='instagram'){try{sourceUrl=linkValue('instagramImageUrl',true);}catch(e){alert(e.message);return false;}}
    return true;
  }
  window.prepareImageDraftManually=function(){if(checkImageSource()){operation++;openExerciseImportDraft(parseText(currentOcr));}};
  window.runExerciseOcr=async function(){
    if(!checkImageSource())return;
    const btn=document.getElementById('ocrExerciseBtn'),status=document.getElementById('ocrExerciseStatus');
    const input=document.getElementById('imgExerciseFile'),manual=document.getElementById('manualImageDraftBtn');
    const version=++operation,files=[...currentFiles],texts=[];
    try{
      if(btn)btn.disabled=true;if(input)input.disabled=true;if(manual)manual.disabled=true;
      if(status)status.textContent='Preparazione OCR…';
      await ensureTesseract();
      for(let i=0;i<files.length;i++){
        if(version!==operation||!btn?.isConnected)return;
        const result=await window.Tesseract.recognize(files[i],'ita',{logger:m=>{if(status?.isConnected&&m.status==='recognizing text')status.textContent=`Screenshot ${i+1}/${files.length} · Trascrizione ${Math.round((m.progress||0)*100)}%`;}});
        texts.push(result?.data?.text?.trim()||'');
      }
      if(version!==operation||!btn?.isConnected)return;
      currentOcr=texts.filter(Boolean).join('\n\n');
      openExerciseImportDraft({...parseText(currentOcr),notice:currentOcr?'':'Nessun testo riconosciuto. Compila la descrizione usando le immagini come riferimento.'});
    }catch(err){
      if(version!==operation||!btn?.isConnected)return;
      console.error(err);currentOcr=texts.filter(Boolean).join('\n\n');
      openExerciseImportDraft({...parseText(currentOcr),notice:'Trascrizione non completata. Controlla il testo disponibile e integra manualmente la bozza.'});
    }finally{if(btn)btn.disabled=false;if(input)input.disabled=false;if(manual)manual.disabled=false;}
  };
  window.openExerciseImportDraft=function(d={}){
    closeM();clearPreviews();
    modal(`<div class="mh"><h3>BOZZA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p><span class="pill yellow">${window.osgbExerciseImport.sourceLabel(importSource)}</span></p>
      <p class="muted">Controlla e correggi i dati riconosciuti prima di salvare.${d.notice?' '+esc(d.notice):''}</p>
      ${sourceUrl?`<p class="muted exercise-source-url">${esc(sourceUrl)}</p>`:''}
      <div class="field"><label for="impTitle">Titolo</label><input id="impTitle" value="${esc(d.title||'')}"></div>
      <div class="grid g2"><div class="field"><label for="impCategory">Categoria</label><input id="impCategory" value="${esc(d.category||'')}"></div><div class="field"><label for="impDuration">Durata (min)</label><input id="impDuration" type="number" min="1" value="${esc(d.duration||'')}"></div></div>
      <div class="field"><label for="impObjective">Obiettivo</label><input id="impObjective" value="${esc(d.objective||'')}"></div>
      <div class="field"><label for="impSpace">Spazio</label><input id="impSpace" value="${esc(d.space||'')}"></div>
      <div class="field"><label for="impEquipment">Materiale</label><input id="impEquipment" value="${esc(d.equipment||'')}"></div>
      <div class="field"><label for="impDescription">Descrizione</label><textarea id="impDescription" style="min-height:150px">${esc(d.description||'')}</textarea></div>
      <div class="field"><label for="impVariants">Varianti</label><textarea id="impVariants">${esc(d.variants||'')}</textarea></div>
      <div class="field"><label for="impNotes">Note</label><textarea id="impNotes">${esc(d.notes||'')}</textarea></div>
      ${currentFiles.length?importSource==='pdf'?`<div class="card"><b>PDF originale</b><p class="muted">${esc(currentFile.name)}</p></div><label class="import-option"><input type="checkbox" id="impSaveImages" ${d.saveImages===false?'':'checked'}>Salva il PDF originale</label>`:`<details class="card"><summary>Immagini originali (${currentFiles.length})</summary>${currentFiles.map(file=>`<img src="${previewUrl(file)}" alt="${esc(file.name)}" style="display:block;width:100%;max-height:300px;object-fit:contain;margin-top:8px">`).join('')}</details><label class="import-option"><input type="checkbox" id="impSaveImages" ${d.saveImages===false?'':'checked'}>Salva ${currentFiles.length>1?'le immagini originali':'l’immagine originale'}</label>`:''}
      <label class="import-option"><input type="checkbox" id="impSaveText" ${d.saveText===false?'':'checked'}>Salva il testo trascritto</label>
      <details class="card" style="margin-bottom:12px"><summary>Controlla testo trascritto</summary><div class="field"><label for="impTranscript">Testo trascritto (modificabile)</label><textarea id="impTranscript" style="min-height:160px">${esc(d.transcript??currentOcr)}</textarea></div></details>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="openDiagramEditor()"><i data-lucide="goal"></i>Ricrea schema grafico</button><button class="btn" id="saveImportedExerciseBtn" onclick="saveImportedExercise()"><i data-lucide="save"></i>${pdfDraftIndex<pdfDrafts.length-1?'Salva e continua':'Salva esercizio'}</button></div>`);
  };
  function draftSnapshot(){return {title:textVal('impTitle'),category:textVal('impCategory'),duration:textVal('impDuration'),objective:textVal('impObjective'),space:textVal('impSpace'),equipment:textVal('impEquipment'),description:textVal('impDescription'),variants:textVal('impVariants'),notes:textVal('impNotes'),transcript:textVal('impTranscript'),saveImages:checked('impSaveImages'),saveText:checked('impSaveText')};}
  function renderDiagram(){
    const svg=document.getElementById('diagramCanvas');if(!svg)return;
    const defs='<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#17396f"/></marker></defs>';
    const field='<rect x="4" y="4" width="492" height="292" rx="12" fill="#2a9e5a" stroke="#fff" stroke-width="3"/><line x1="250" y1="4" x2="250" y2="296" stroke="#fff" stroke-width="2" opacity=".8"/><circle cx="250" cy="150" r="45" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>';
    const items=diagramItems.map((it,i)=>{
      if(it.type==='blue'||it.type==='yellow')return `<g data-i="${i}"><circle cx="${it.x}" cy="${it.y}" r="11" fill="${it.type==='blue'?'#245ab7':'#f1dc2a'}" stroke="#fff" stroke-width="3"/><text x="${it.x}" y="${it.y+4}" text-anchor="middle" font-size="9" font-weight="700" fill="${it.type==='blue'?'#fff':'#3f3900'}">${i+1}</text></g>`;
      if(it.type==='cone')return `<polygon data-i="${i}" points="${it.x},${it.y-10} ${it.x-8},${it.y+8} ${it.x+8},${it.y+8}" fill="#ff7b22" stroke="#fff" stroke-width="2"/>`;
      if(it.type==='ball')return `<circle data-i="${i}" cx="${it.x}" cy="${it.y}" r="7" fill="#fff" stroke="#17396f" stroke-width="2"/>`;
      if(it.type==='arrow')return `<line data-i="${i}" x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="#17396f" stroke-width="4" stroke-dasharray="8 5" marker-end="url(#arrowhead)"/>`;
      return '';
    }).join('');
    svg.innerHTML=defs+field+items;
  }

  window.openDiagramEditor=function(){
    window.__exerciseDraft=draftSnapshot();closeM();
    modal(`<div class="mh"><h3>SCHEMA GRAFICO</h3><button class="close" onclick="backToExerciseDraft()"><i data-lucide="x"></i></button></div>
      <p class="muted">Usa l’immagine originale come riferimento e ricrea uno schema pulito. Seleziona uno strumento e tocca il campo.</p>
      ${currentFile?`<div class="card" style="margin-bottom:10px"><b>Riferimento originale</b><img id="diagramSourcePreview" style="display:block;width:100%;max-height:240px;object-fit:contain;margin-top:8px;border-radius:10px"></div>`:''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button class="btn alt" onclick="setDiagramTool('blue')">🔵 Giocatore</button><button class="btn alt" onclick="setDiagramTool('yellow')">🟡 Giocatore</button><button class="btn alt" onclick="setDiagramTool('cone')">🔺 Cinesino</button><button class="btn alt" onclick="setDiagramTool('ball')">⚽ Pallone</button><button class="btn alt" onclick="setDiagramTool('arrow')">➡️ Freccia</button><button class="btn alt" onclick="undoDiagram()">↶ Annulla</button><button class="btn alt" onclick="clearDiagram()">Pulisci</button></div>
      <div class="card" style="padding:8px;overflow:auto"><svg id="diagramCanvas" viewBox="0 0 500 300" style="display:block;width:100%;min-width:300px;touch-action:none" onclick="diagramCanvasClick(event)"></svg></div>
      <p class="muted" id="diagramHint">Strumento: giocatore blu</p>
      <button class="btn" style="margin-top:10px" onclick="backToExerciseDraft()"><i data-lucide="check"></i>Usa questo schema</button>`);
    window.__diagramTool='blue';renderDiagram();
    if(currentFile){const img=document.getElementById('diagramSourcePreview');if(img)img.src=previewUrl(currentFile);}
  };

  window.setDiagramTool=function(t){window.__diagramTool=t;arrowStart=null;const h=document.getElementById('diagramHint');if(h)h.textContent=t==='arrow'?'Freccia: tocca punto iniziale e punto finale':`Strumento: ${t}`;};
  window.diagramCanvasClick=function(ev){const svg=document.getElementById('diagramCanvas');if(!svg)return;const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());const x=Math.max(10,Math.min(490,p.x)),y=Math.max(10,Math.min(290,p.y)),t=window.__diagramTool||'blue';if(t==='arrow'){if(!arrowStart){arrowStart={x,y};const h=document.getElementById('diagramHint');if(h)h.textContent='Ora tocca il punto finale della freccia';return;}diagramItems.push({type:'arrow',x1:arrowStart.x,y1:arrowStart.y,x2:x,y2:y});arrowStart=null;}else diagramItems.push({type:t,x,y});renderDiagram();};
  window.undoDiagram=function(){diagramItems.pop();arrowStart=null;renderDiagram();};
  window.clearDiagram=function(){if(confirm('Pulire tutto lo schema?')){diagramItems=[];arrowStart=null;renderDiagram();}};
  window.backToExerciseDraft=function(){const d=window.__exerciseDraft||{};const svg=document.getElementById('diagramCanvas');window.__diagramSvg=svg?.outerHTML||window.__diagramSvg||null;openExerciseImportDraft(d);};

  window.saveImportedExercise=async function(){
    if(saving)return;
    if(!client||!user){alert('Connessione non disponibile. Accedi nuovamente e riprova.');return;}
    const draft=draftSnapshot();
    if(!draft.title){alert('Inserisci il titolo.');return;}
    const duration=draft.duration?Number(draft.duration):null;
    if(duration!==null&&(!Number.isInteger(duration)||duration<1)){alert('Inserisci una durata intera maggiore di zero.');return;}
    const btn=document.getElementById('saveImportedExerciseBtn'),version=operation;
    const files=draft.saveImages?[...currentFiles]:[],uploaded=[];
    const row={owner_user_id:user.id,title:draft.title,category:draft.category||null,duration_minutes:duration,objective:draft.objective||null,space:draft.space||null,equipment:draft.equipment||null,description:draft.description||null,variants:draft.variants||null,notes:draft.notes||null,source_type:importSource,source_url:sourceUrl||null,source_ocr_text:draft.saveText?(draft.transcript||null):null,diagram_svg:window.__diagramSvg||null,imported_at:new Date().toISOString()};
    saving=true;if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    let inserted=false;
    try{
      const batch=crypto.randomUUID();
      for(let i=0;i<files.length;i++){
        const file=files[i],path=`${user.id}/${batch}-${i}-${safe(file.name)}`;
        const up=await client.storage.from('exercise-images').upload(path,file,{cacheControl:'3600',contentType:file.type||undefined,upsert:false});
        if(up.error)throw up.error;
        uploaded.push({path,name:file.name,type:file.type||null});
      }
      row.source_images=uploaded;
      row.source_image_path=uploaded[0]?.path||null;
      row.source_image_name=uploaded[0]?.name||null;
      const ins=await client.from('exercises').insert(row);if(ins.error)throw ins.error;
      inserted=true;
      if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();
      if(version===operation&&btn?.isConnected){
        if(pdfDraftIndex<pdfDrafts.length-1){pdfDraftIndex++;openPdfDraft(pdfDraftIndex);}
        else{resetImport('image');window.__exerciseFilter=row.source_type;closeM();exercises(row.source_type);}
      }
    }catch(err){
      if(!inserted&&uploaded.length){
        try{const removed=await client.storage.from('exercise-images').remove(uploaded.map(x=>x.path));if(removed.error)console.warn('Pulizia immagini incompleta',removed.error);}catch(cleanupError){console.warn('Pulizia immagini incompleta',cleanupError);}
      }
      console.error(err);
      alert(inserted?'Esercizio salvato. Riapri l’archivio per visualizzarlo.':'Impossibile salvare l’esercizio. La bozza è ancora disponibile: riprova.');
      if(inserted&&version===operation&&btn?.isConnected){resetImport('image');closeM();}
    }finally{saving=false;if(btn){btn.disabled=false;btn.textContent='Salva esercizio';}}
  };

  window.importExerciseWeb=function(){
    closeM();
    modal(`<div class="mh"><h3>IMPORTA DAL WEB</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Inserisci il link della fonte. L’app proverà a leggere la pagina; se il sito blocca l’accesso diretto, puoi incollare il testo nella casella sotto.</p><div class="field"><label>URL fonte</label><input id="webSourceUrl" type="url" placeholder="https://..."></div><div class="field"><label>Testo esercizio</label><textarea id="webSourceText" style="min-height:180px" placeholder="Incolla qui il testo se necessario"></textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="tryFetchExerciseWeb()"><i data-lucide="download"></i>Prova a leggere il link</button><button class="btn" onclick="prepareExerciseWebDraft()"><i data-lucide="wand-sparkles"></i>Crea bozza</button></div><div id="webImportStatus" class="muted" style="margin-top:8px"></div>`);
  };
  window.tryFetchExerciseWeb=async function(){const url=textVal('webSourceUrl'),s=document.getElementById('webImportStatus');if(!url)return;try{if(s)s.textContent='Lettura pagina…';const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const html=await r.text();const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,noscript').forEach(x=>x.remove());const text=doc.body?.innerText?.replace(/\n{3,}/g,'\n\n').trim()||'';document.getElementById('webSourceText').value=text.slice(0,12000);if(s)s.textContent='Pagina letta. Controlla il testo e crea la bozza.';}catch(e){if(s)s.textContent='Questo sito non consente la lettura diretta dal browser. Incolla il testo della pagina qui sopra.';}};
  window.prepareExerciseWebDraft=function(){const text=textVal('webSourceText');if(!text){alert('Inserisci o recupera il testo dell’esercizio.');return;}const url=textVal('webSourceUrl');window.__webImportUrl=url;window.__webImportText=text;const d=parseText(text);closeM();modal(`<div class="mh"><h3>BOZZA DAL WEB</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="field"><label>Titolo</label><input id="webTitle" value="${esc(d.title)}"></div><div class="grid g2"><div class="field"><label>Categoria</label><input id="webCategory" value="${esc(d.category)}"></div><div class="field"><label>Durata</label><input id="webDuration" type="number" value="${esc(d.duration||10)}"></div></div><div class="field"><label>Obiettivo</label><input id="webObjective" value="${esc(d.objective)}"></div><div class="field"><label>Spazio</label><input id="webSpace" value="${esc(d.space)}"></div><div class="field"><label>Materiale</label><input id="webEquipment" value="${esc(d.equipment)}"></div><div class="field"><label>Descrizione</label><textarea id="webDescription" style="min-height:180px">${esc(d.description)}</textarea></div><div class="field"><label>Varianti</label><textarea id="webVariants"></textarea></div><button class="btn" onclick="saveWebExercise()"><i data-lucide="save"></i>Salva nell’archivio</button>`);};
  window.saveWebExercise=async function(){if(!client||!user)return;const title=textVal('webTitle');if(!title){alert('Inserisci il titolo.');return;}const row={owner_user_id:user.id,title,category:textVal('webCategory')||null,duration_minutes:parseInt(textVal('webDuration')||'0',10)||null,objective:textVal('webObjective')||null,space:textVal('webSpace')||null,equipment:textVal('webEquipment')||null,description:textVal('webDescription')||null,variants:textVal('webVariants')||null,source_type:'web',source_url:window.__webImportUrl||null,source_ocr_text:window.__webImportText||null,imported_at:new Date().toISOString()};const {error}=await client.from('exercises').insert(row);if(error){console.error(error);alert('Impossibile salvare l’esercizio.');return;}window.__webImportUrl=null;window.__webImportText=null;if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();};

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;client?.auth.getUser().then(({data})=>{user=data?.user||null;});});
})();
