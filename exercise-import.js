(function(){
  let client=null,user=null,currentFile=null,currentOcr='',diagramItems=[],arrowStart=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safe=s=>String(s||'file').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'file';
  const textVal=id=>document.getElementById(id)?.value.trim()||'';
  const parseText=text=>{
    const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const joined=lines.join(' ');
    const duration=(joined.match(/(?:durata|tempo)\s*[:\-]?\s*(\d{1,3})\s*(?:min|')/i)||[])[1]||'';
    const space=(joined.match(/(?:spazio|campo)\s*[:\-]?\s*([^.;\n]{3,40})/i)||[])[1]||'';
    const equipment=(joined.match(/(?:materiale|attrezzatura)\s*[:\-]?\s*([^.;\n]{3,90})/i)||[])[1]||'';
    const objective=(joined.match(/(?:obiettivo|finalit[aà])\s*[:\-]?\s*([^.;\n]{3,90})/i)||[])[1]||'';
    let category='';
    const low=joined.toLowerCase();
    if(low.includes('1 contro 1')||low.includes('1vs1'))category='1 contro 1';
    else if(low.includes('conduzione'))category='Conduzione';
    else if(low.includes('passaggio'))category='Passaggio e ricezione';
    else if(low.includes('coordinaz'))category='Coordinazione';
    else if(low.includes('finalizz'))category='Finalizzazione';
    else if(low.includes('possesso'))category='Gioco e collaborazione';
    return {title:lines[0]?.slice(0,110)||'Esercizio importato',category,duration,objective,space,equipment,description:lines.slice(1).join('\n').slice(0,5000)};
  };

  function ensureTesseract(){
    if(window.Tesseract)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('OCR non disponibile'));document.head.appendChild(s);
    });
  }

  window.importExerciseImage=function(){
    closeM();currentFile=null;currentOcr='';diagramItems=[];arrowStart=null;
    modal(`<div class="mh"><h3>IMPORTA DA IMMAGINE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Carica una foto o uno screenshot. Il testo viene trascritto nel browser e potrai correggerlo prima del salvataggio.</p>
      <div class="field"><label>Immagine</label><input id="imgExerciseFile" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="previewExerciseImage(this)"></div>
      <div id="imgExercisePreview"></div>
      <button class="btn yellow" id="ocrExerciseBtn" onclick="runExerciseOcr()"><i data-lucide="scan-text"></i>Trascrivi immagine</button>
      <div id="ocrExerciseStatus" class="muted" style="margin-top:10px"></div>`);
  };

  window.previewExerciseImage=function(input){
    const file=input?.files?.[0];if(!file)return;currentFile=file;
    if(file.size>5*1024*1024){alert('L’immagine supera 5 MB.');input.value='';currentFile=null;return;}
    const url=URL.createObjectURL(file);const box=document.getElementById('imgExercisePreview');if(box)box.innerHTML=`<img src="${url}" alt="Anteprima" style="display:block;width:100%;max-height:360px;object-fit:contain;border-radius:12px;margin:8px 0 12px">`;
  };

  window.runExerciseOcr=async function(){
    if(!currentFile){alert('Seleziona prima un’immagine.');return;}
    const btn=document.getElementById('ocrExerciseBtn'),status=document.getElementById('ocrExerciseStatus');
    try{
      if(btn)btn.disabled=true;if(status)status.textContent='Preparazione OCR…';
      await ensureTesseract();
      const result=await window.Tesseract.recognize(currentFile,'ita',{logger:m=>{if(status&&m.status==='recognizing text')status.textContent=`Trascrizione ${Math.round((m.progress||0)*100)}%`;}});
      currentOcr=result?.data?.text||'';
      const draft=parseText(currentOcr);openExerciseImportDraft(draft);
    }catch(err){console.error(err);alert('Non sono riuscito a trascrivere automaticamente questa immagine. Puoi comunque inserire il testo manualmente.');openExerciseImportDraft({title:'Esercizio importato',description:''});}
    finally{if(btn)btn.disabled=false;}
  };

  window.openExerciseImportDraft=function(d={}){
    closeM();
    modal(`<div class="mh"><h3>BOZZA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Controlla e correggi i dati riconosciuti prima di salvare.</p>
      <div class="field"><label>Titolo</label><input id="impTitle" value="${esc(d.title||'')}"></div>
      <div class="grid g2"><div class="field"><label>Categoria</label><input id="impCategory" value="${esc(d.category||'')}"></div><div class="field"><label>Durata (min)</label><input id="impDuration" type="number" min="1" value="${esc(d.duration||10)}"></div></div>
      <div class="field"><label>Obiettivo</label><input id="impObjective" value="${esc(d.objective||'')}"></div>
      <div class="field"><label>Spazio</label><input id="impSpace" value="${esc(d.space||'')}"></div>
      <div class="field"><label>Materiale</label><input id="impEquipment" value="${esc(d.equipment||'')}"></div>
      <div class="field"><label>Descrizione</label><textarea id="impDescription" style="min-height:150px">${esc(d.description||'')}</textarea></div>
      <div class="field"><label>Varianti</label><textarea id="impVariants"></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="openDiagramEditor()"><i data-lucide="goal"></i>Ricrea schema grafico</button><button class="btn" id="saveImportedExerciseBtn" onclick="saveImportedExercise()"><i data-lucide="save"></i>Salva esercizio</button></div>`);
  };

  function draftSnapshot(){return {title:textVal('impTitle'),category:textVal('impCategory'),duration:textVal('impDuration'),objective:textVal('impObjective'),space:textVal('impSpace'),equipment:textVal('impEquipment'),description:textVal('impDescription'),variants:textVal('impVariants')};}
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
    if(currentFile){const img=document.getElementById('diagramSourcePreview');if(img)img.src=URL.createObjectURL(currentFile);}
  };

  window.setDiagramTool=function(t){window.__diagramTool=t;arrowStart=null;const h=document.getElementById('diagramHint');if(h)h.textContent=t==='arrow'?'Freccia: tocca punto iniziale e punto finale':`Strumento: ${t}`;};
  window.diagramCanvasClick=function(ev){const svg=document.getElementById('diagramCanvas');if(!svg)return;const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());const x=Math.max(10,Math.min(490,p.x)),y=Math.max(10,Math.min(290,p.y)),t=window.__diagramTool||'blue';if(t==='arrow'){if(!arrowStart){arrowStart={x,y};const h=document.getElementById('diagramHint');if(h)h.textContent='Ora tocca il punto finale della freccia';return;}diagramItems.push({type:'arrow',x1:arrowStart.x,y1:arrowStart.y,x2:x,y2:y});arrowStart=null;}else diagramItems.push({type:t,x,y});renderDiagram();};
  window.undoDiagram=function(){diagramItems.pop();arrowStart=null;renderDiagram();};
  window.clearDiagram=function(){if(confirm('Pulire tutto lo schema?')){diagramItems=[];arrowStart=null;renderDiagram();}};
  window.backToExerciseDraft=function(){const d=window.__exerciseDraft||{};const svg=document.getElementById('diagramCanvas');window.__diagramSvg=svg?.outerHTML||window.__diagramSvg||null;openExerciseImportDraft(d);};

  window.saveImportedExercise=async function(){
    if(!client||!user||!currentFile)return;
    const title=textVal('impTitle');if(!title){alert('Inserisci il titolo.');return;}
    const btn=document.getElementById('saveImportedExerciseBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const path=`${user.id}/${Date.now()}-${safe(currentFile.name)}`;
    const up=await client.storage.from('exercise-images').upload(path,currentFile,{cacheControl:'3600',upsert:false});
    if(up.error){console.error(up.error);alert('Impossibile caricare l’immagine.');if(btn){btn.disabled=false;btn.textContent='Salva esercizio';}return;}
    const row={owner_user_id:user.id,title,category:textVal('impCategory')||null,duration_minutes:parseInt(textVal('impDuration')||'0',10)||null,objective:textVal('impObjective')||null,space:textVal('impSpace')||null,equipment:textVal('impEquipment')||null,description:textVal('impDescription')||null,variants:textVal('impVariants')||null,source_type:'image',source_image_path:path,source_image_name:currentFile.name,source_ocr_text:currentOcr||null,diagram_svg:window.__diagramSvg||null,imported_at:new Date().toISOString()};
    const ins=await client.from('exercises').insert(row);
    if(ins.error){await client.storage.from('exercise-images').remove([path]);console.error(ins.error);alert('Impossibile salvare l’esercizio.');if(btn){btn.disabled=false;btn.textContent='Salva esercizio';}return;}
    currentFile=null;currentOcr='';diagramItems=[];window.__diagramSvg=null;window.__exerciseDraft=null;
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();
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