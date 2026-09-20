(function(){
  let client=null,user=null,sessions=[],templates=[],pdfDrafts=[],pdfDraftIndex=0,pdfSaving=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{if(!d)return'';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const today=()=>new Date().toISOString().slice(0,10);
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  async function loadSessions(){
    if(!client)return;
    const {data,error}=await client.from('training_sessions').select('id,session_date,title,duration_minutes,objective,intensity,style,notes,structure,player_count,coach_count,is_template,created_at').order('created_at',{ascending:false});
    if(error){console.error('training load',error);return;}
    const all=data||[];
    sessions=all.filter(x=>!x.is_template).sort((a,b)=>String(b.session_date||'').localeCompare(String(a.session_date||'')));
    templates=all.filter(x=>x.is_template);
    if(S.r==='train')render();
  }

  function scoreExercise(ex,objective){
    const q=norm(objective).split(/\s+/).filter(w=>w.length>3);
    const hay=norm([ex.title,ex.category,ex.objective,ex.description].filter(Boolean).join(' '));
    return q.reduce((n,w)=>n+(hay.includes(w)?1:0),0);
  }

  function splitGroups(players,groups){
    groups=Math.max(1,Math.min(groups,players));
    const base=Math.floor(players/groups),rest=players%groups;
    return Array.from({length:groups},(_,i)=>base+(i<rest?1:0));
  }

  function exercisePayload(ex){
    return {title:ex.title,exercise_id:ex.id||null,category:ex.category||null,objective:ex.objective||null,space:ex.space||null,equipment:ex.equipment||null,description:ex.description||null,variants:ex.variants||null};
  }

  function buildStructure(total,objective,players,coaches){
    const lib=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];
    const usable=lib.filter(x=>Number(x.duration_minutes)>0).map(x=>({...x,_score:scoreExercise(x,objective)})).sort((a,b)=>b._score-a._score);
    const blocks=[];let used=0;
    const warm=Math.min(total>=75?12:10,total);
    blocks.push({order:1,title:'Attivazione ludico-motoria',duration_minutes:warm,source:'ai',ai_generated:true,category:'Attivazione',objective:'Attivazione motoria',description:'Attivazione ludico-motoria generata automaticamente in base alla durata e alla struttura della seduta.'});used+=warm;

    if(coaches>=2&&players>=8&&total-used>=35){
      const stationCount=Math.min(3,coaches,players);
      const stationDuration=Math.min(total>=90?30:25,Math.max(20,total-used-20));
      const groups=splitGroups(players,stationCount);
      const rotation=Math.max(6,Math.floor(stationDuration/stationCount));
      const fallback=['Conduzione e dominio palla','Duelli 1 contro 1','Passaggio e collaborazione'];
      const stations=Array.from({length:stationCount},(_,i)=>{
        const ex=usable[i];
        return ex?{station:i+1,group_size:groups[i],...exercisePayload(ex)}:{station:i+1,group_size:groups[i],title:fallback[i]||objective,exercise_id:null,category:'Generato AI',objective,space:null,equipment:null,description:'Esercizio generato automaticamente per la stazione in base a obiettivo, numero di bambini e istruttori.',variants:null,source:'ai',ai_generated:true};
      });
      blocks.push({order:blocks.length+1,title:'Circuito a stazioni',duration_minutes:stationDuration,source:'stations',rotation_minutes:rotation,groups,stations});used+=stationDuration;
    }else{
      const maxLibrary=Math.max(0,total-used-15);let libraryUsed=0;
      for(const ex of usable){
        const d=Number(ex.duration_minutes)||0;
        if(!d||libraryUsed+d>maxLibrary)continue;
        blocks.push({order:blocks.length+1,...exercisePayload(ex),duration_minutes:d,source:'library'});used+=d;libraryUsed+=d;
        if(used>=total-20)break;
      }
    }

    let remaining=total-used;
    if(remaining>10){const theme=Math.max(10,remaining-10);blocks.push({order:blocks.length+1,title:`Gioco a tema · ${objective}`,duration_minutes:theme,source:'ai',ai_generated:true,category:'Gioco a tema',objective,description:'Gioco a tema generato automaticamente in funzione dell’obiettivo della seduta.'});used+=theme;}
    if(used<total)blocks.push({order:blocks.length+1,title:'Partita finale / gioco libero',duration_minutes:total-used,source:'ai',ai_generated:true,category:'Gioco situazionale',objective:'Gioco libero e applicazione',description:'Fase finale generata automaticamente per completare la durata della seduta.'});
    return blocks.map((x,i)=>({...x,order:i+1}));
  }

  function weekSummary(){
    const now=new Date(),start=new Date(now);start.setDate(now.getDate()-((now.getDay()+6)%7));start.setHours(0,0,0,0);const end=new Date(start);end.setDate(start.getDate()+7);
    const arr=sessions.filter(s=>{if(!s.session_date)return false;const d=new Date(s.session_date+'T12:00:00');return d>=start&&d<end});
    return {count:arr.length,mins:arr.reduce((n,s)=>n+(Number(s.duration_minutes)||0),0),objective:arr[0]?.objective||'—'};
  }

  function editControls(sessionId,index){
    if(!sessionId)return'';
    return `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px"><button class="btn alt" style="padding:6px 8px" onclick='moveTrainingBlock(${JSON.stringify(String(sessionId))},${index},-1)'><i data-lucide="arrow-up"></i></button><button class="btn alt" style="padding:6px 8px" onclick='moveTrainingBlock(${JSON.stringify(String(sessionId))},${index},1)'><i data-lucide="arrow-down"></i></button></div>`;
  }

  function structureHtml(structure,sessionId){
    return structure.map((x,index)=>{
      if(x.source==='stations'){
        const stations=(x.stations||[]).map((s,si)=>`<div class="card" style="margin-top:8px"><b>Stazione ${s.station} · ${s.group_size} bambini</b><p style="margin:6px 0">${esc(s.title)}</p>${s.space?`<small class="muted">${esc(s.space)}</small>`:''}${sessionId?`<div style="margin-top:7px"><button class="btn alt" style="padding:6px 9px" onclick='replaceTrainingExercise(${JSON.stringify(String(sessionId))},${index},${si})'><i data-lucide="refresh-cw"></i>Sostituisci</button></div>`:''}</div>`).join('');
        return `<div class="event"><div class="date">${x.duration_minutes} min</div><div class="body"><strong>${esc(x.title)}</strong><small>${x.groups?.join('–')||''} bambini · cambio ogni ${x.rotation_minutes||'—'} min</small>${stations}${editControls(sessionId,index)}</div></div>`;
      }
      return `<div class="event"><div class="date">${esc(x.duration_minutes||'')} min</div><div class="body"><strong>${esc(x.title||'Esercizio')}</strong><small>${x.source==='library'?'Da archivio esercizi':x.source==='ai'?'Generato con AI':'Blocco standard'}${x.space?' · '+esc(x.space):''}</small>${sessionId?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">${editControls(sessionId,index)}<button class="btn alt" style="padding:6px 9px" onclick='replaceTrainingExercise(${JSON.stringify(String(sessionId))},${index},null)'><i data-lucide="refresh-cw"></i>Sostituisci</button></div>`:''}</div></div>`;
    }).join('');
  }

  function ensurePdfJs(){
    if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';script.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(window.pdfjsLib);};script.onerror=()=>reject(new Error('PDF.js non disponibile'));document.head.appendChild(script);});
  }

  function pdfBlockFields(block,index){return `<div class="card" style="margin-top:10px"><b>Esercizio ${index+1}</b><div class="field"><label>Titolo</label><input id="pdfBlockTitle${index}" value="${esc(block.title||'')}"></div><div class="field"><label>Durata (minuti)</label><input id="pdfBlockDuration${index}" type="number" min="1" max="180" value="${Number(block.duration_minutes)||10}"></div><div class="field"><label>Descrizione</label><textarea id="pdfBlockDescription${index}" rows="4">${esc(block.description||'')}</textarea></div></div>`;}

  function collectPdfDraft(){
    const draft=pdfDrafts[pdfDraftIndex];if(!draft)return null;
    const structure=(draft.structure||[]).map((block,index)=>({...block,order:index+1,title:document.getElementById(`pdfBlockTitle${index}`)?.value.trim()||`Esercizio ${index+1}`,duration_minutes:Math.max(1,Number(document.getElementById(`pdfBlockDuration${index}`)?.value)||10),description:document.getElementById(`pdfBlockDescription${index}`)?.value.trim()||null}));
    return {...draft,session_date:document.getElementById('pdfTrainingDate')?.value||'',title:document.getElementById('pdfTrainingTitle')?.value.trim()||`Seduta pagina ${draft.page_number}`,duration_minutes:Math.max(1,Number(document.getElementById('pdfTrainingDuration')?.value)||structure.reduce((n,x)=>n+x.duration_minutes,0)||60),player_count:Math.max(1,Number(document.getElementById('pdfTrainingPlayers')?.value)||17),coach_count:Math.max(1,Number(document.getElementById('pdfTrainingCoaches')?.value)||3),objective:document.getElementById('pdfTrainingObjective')?.value.trim()||'Allenamento',notes:document.getElementById('pdfTrainingNotes')?.value.trim()||null,structure};
  }

  function showPdfDraft(){
    const d=pdfDrafts[pdfDraftIndex];if(!d)return;const duplicate=d.session_date&&sessions.some(s=>s.session_date===d.session_date);
    modal(`<div class="mh"><h3>SEDUTA ${pdfDraftIndex+1} DI ${pdfDrafts.length}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Pagina ${d.page_number} del PDF. Controlla i dati riconosciuti prima di salvarli.</p>${!d.session_date?'<p style="color:#b42318"><b>Data non riconosciuta:</b> inseriscila manualmente.</p>':duplicate?'<p style="color:#b42318"><b>Attenzione:</b> esiste già una seduta in questa data.</p>':''}<div class="field"><label>Data</label><input id="pdfTrainingDate" type="date" value="${esc(d.session_date||'')}"></div><div class="field"><label>Titolo</label><input id="pdfTrainingTitle" value="${esc(d.title||'')}"></div><div class="grid g2"><div class="field"><label>Bambini</label><input id="pdfTrainingPlayers" type="number" min="1" max="60" value="${Number(d.player_count)||17}"></div><div class="field"><label>Istruttori</label><input id="pdfTrainingCoaches" type="number" min="1" max="20" value="${Number(d.coach_count)||3}"></div></div><div class="field"><label>Durata totale (minuti)</label><input id="pdfTrainingDuration" type="number" min="1" max="300" value="${Number(d.duration_minutes)||60}"></div><div class="field"><label>Obiettivo</label><input id="pdfTrainingObjective" value="${esc(d.objective||'')}"></div><div class="field"><label>Note</label><input id="pdfTrainingNotes" value="${esc(d.notes||'')}"></div><div class="section">ESERCIZI RICONOSCIUTI (${(d.structure||[]).length})</div>${(d.structure||[]).map(pdfBlockFields).join('')}<button class="btn" id="savePdfTrainingBtn" style="margin-top:14px" onclick="savePdfTrainingDraft()"><i data-lucide="save"></i>${pdfDraftIndex<pdfDrafts.length-1?'Salva e continua':'Salva ultima seduta'}</button>`);
  }

  window.importTrainingPdf=function(){modal(`<div class="mh"><h3>IMPORTA SEDUTE DA PDF</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p>Ogni pagina verrà trasformata in una seduta distinta. Potrai correggere data, titolo ed esercizi prima del salvataggio.</p><div class="field"><label>PDF multipagina (massimo 30 MB)</label><input id="trainingPdfFile" type="file" accept="application/pdf,.pdf"></div><button class="btn" id="readTrainingPdfBtn" onclick="readTrainingPdf()"><i data-lucide="file-up"></i>Leggi PDF</button>`);};

  window.readTrainingPdf=async function(){
    const file=document.getElementById('trainingPdfFile')?.files?.[0];if(!file){alert('Seleziona un file PDF.');return;}if(file.size>30*1024*1024){alert('Il PDF supera il limite di 30 MB.');return;}const btn=document.getElementById('readTrainingPdfBtn');if(btn){btn.disabled=true;btn.textContent='Lettura in corso…';}
    try{const pdfjs=await ensurePdfJs(),bytes=new Uint8Array(await file.arrayBuffer()),pdf=await pdfjs.getDocument({data:bytes}).promise,drafts=[];for(let n=1;n<=pdf.numPages;n++){if(btn)btn.textContent=`Lettura pagina ${n} di ${pdf.numPages}…`;const page=await pdf.getPage(n),content=await page.getTextContent(),text=content.items.reduce((out,item)=>out+(item.str||'')+(item.hasEOL?'\n':' '),'');drafts.push(window.osgbTrainingPdf.parsePage(text,n,new Date().getFullYear()));}pdfDrafts=drafts;pdfDraftIndex=0;closeM();showPdfDraft();}catch(error){console.error('training PDF import',error);alert('Non riesco a leggere questo PDF. Se è una scansione, prova prima a convertirlo in un PDF con testo selezionabile.');if(btn){btn.disabled=false;btn.textContent='Leggi PDF';}}
  };

  window.savePdfTrainingDraft=async function(){
    if(pdfSaving||!client||!user)return;const draft=collectPdfDraft();if(!draft?.session_date){alert('Inserisci la data della seduta.');return;}if(sessions.some(s=>s.session_date===draft.session_date)){alert('Esiste già una seduta in questa data. Modifica la data prima di continuare.');return;}pdfSaving=true;const btn=document.getElementById('savePdfTrainingBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}const row={...draft,owner_user_id:user.id};delete row.page_number;const {error}=await client.from('training_sessions').insert(row);pdfSaving=false;if(error){console.error('training PDF save',error);alert('Impossibile salvare la seduta.');if(btn){btn.disabled=false;btn.textContent='Riprova';}return;}sessions.push({...row,id:`pdf-${Date.now()}`});if(pdfDraftIndex<pdfDrafts.length-1){pdfDraftIndex++;closeM();showPdfDraft();return;}pdfDrafts=[];closeM();await loadSessions();go('train');alert('Tutte le sedute del PDF sono state importate.');
  };

  window.train=function(){
    const list=sessions.length?sessions.map(s=>`<div class="event"><div class="date"><b>${fmt(s.session_date)||'—'}</b></div><div class="body"><strong>${esc(s.title)}</strong><small>${s.duration_minutes||60} min${s.objective?' · '+esc(s.objective):''}${s.player_count?' · '+s.player_count+' bambini':''}${s.coach_count?' · '+s.coach_count+' istruttori':''}</small></div><button class="btn alt" onclick='openTraining(${JSON.stringify(String(s.id))})'><i data-lucide="chevron-right"></i>Apri</button></div>`).join(''):`<p class="muted">Nessuna seduta salvata.</p>`;
    const exCount=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary.length:0,w=weekSummary();
    return `${ttl('Allenamenti','Crea, salva e riutilizza le sedute')}<div class="grid g4"><div class="card blue"><div class="muted">ROSA ATTIVA</div><div class="kpi">${P.length}</div><p>bambini disponibili</p></div><div class="card"><div class="muted">QUESTA SETTIMANA</div><div class="kpi">${w.count}</div><p>sedute · ${w.mins} min</p></div><div class="card"><div class="muted">MODELLI</div><div class="kpi">${templates.length}</div><button class="btn alt" onclick="openTrainingTemplates()">Apri modelli</button></div><div class="card yellow"><b>Archivio esercizi</b><p class="muted">${exCount} esercizi disponibili</p><button class="btn alt" onclick="exercises()"><i data-lucide="library"></i>Apri esercizi</button></div></div><div class="section">SEDUTE SALVATE</div><div class="card">${list}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" onclick="trainingWizard()"><i data-lucide="sparkles"></i>Crea seduta</button><button class="btn alt" onclick="importTrainingPdf()"><i data-lucide="file-up"></i>Importa sedute da PDF</button></div>`;
  };

  window.trainingWizard=function(existing,mode){
    const s=existing||{},fromTemplate=mode==='template';
    modal(`<div class="mh"><h3>${fromTemplate?'NUOVA SEDUTA DA MODELLO':existing?'MODIFICA ALLENAMENTO':'CREA ALLENAMENTO'}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Data</label><input id="trDate" type="date" value="${esc(fromTemplate?today():(s.session_date||today()))}"></div>
      <div class="field"><label>Titolo</label><input id="trTitle" value="${esc(s.title||'Seduta OSGB 2020')}"></div>
      <div class="grid g2"><div class="field"><label>Bambini</label><input id="trPlayers" type="number" min="1" max="40" value="${Number(s.player_count||P.length||17)}"></div><div class="field"><label>Istruttori</label><input id="trCoaches" type="number" min="1" max="10" value="${Number(s.coach_count||3)}"></div></div>
      <div class="field"><label>Durata</label><select id="trDuration">${[60,75,90].map(v=>`<option value="${v}" ${Number(s.duration_minutes||60)===v?'selected':''}>${v} min</option>`).join('')}</select></div>
      <div class="field"><label>Obiettivo</label><select id="trObjective">${['Conduzione e 1 contro 1','Coordinazione','Passaggio e ricezione','Finalizzazione','Gioco e collaborazione'].map(v=>`<option ${s.objective===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Intensità</label><select id="trIntensity">${['Bassa','Media','Alta'].map(v=>`<option ${String(s.intensity||'Media')===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Stile</label><select id="trStyle">${['Scuola Calcio','Gioco libero','Tecnico'].map(v=>`<option ${String(s.style||'Scuola Calcio')===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Note</label><input id="trNotes" value="${esc(s.notes||'')}" placeholder="Note facoltative"></div>
      <p class="muted">Puoi rigenerare la struttura oppure, se parti da un modello, usare direttamente la sua struttura salvata.</p>
      ${fromTemplate?`<button class="btn alt" style="margin-right:7px" onclick='useTemplateStructure(${JSON.stringify(String(s.id))})'><i data-lucide="copy"></i>Usa struttura modello</button>`:''}<button class="btn" onclick="genTrain(${(!fromTemplate&&existing)?JSON.stringify(String(s.id)):'null'})"><i data-lucide="sparkles"></i>${existing&&!fromTemplate?'Rigenera struttura':'Genera struttura'}</button>`);
  };

  window.genTrain=function(editId){
    const duration=parseInt(document.getElementById('trDuration')?.value||'60',10),objective=document.getElementById('trObjective')?.value||'Seduta';
    const players=Math.max(1,parseInt(document.getElementById('trPlayers')?.value||String(P.length||17),10)||17),coaches=Math.max(1,parseInt(document.getElementById('trCoaches')?.value||'3',10)||3);
    window.__pendingTraining={id:editId||null,session_date:document.getElementById('trDate')?.value||today(),title:document.getElementById('trTitle')?.value.trim()||'Seduta OSGB 2020',duration_minutes:duration,player_count:players,coach_count:coaches,objective,intensity:document.getElementById('trIntensity')?.value||null,style:document.getElementById('trStyle')?.value||null,notes:document.getElementById('trNotes')?.value.trim()||null,structure:buildStructure(duration,objective,players,coaches),is_template:false};
    closeM();previewPendingTraining();
  };

  function previewPendingTraining(){
    const p=window.__pendingTraining;if(!p)return;
    modal(`<div class="mh"><h3>SEDUTA ${p.id?'RIGENERATA':'GENERATA'} · ${p.duration_minutes}'</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">${p.player_count} bambini · ${p.coach_count} istruttori</p>${structureHtml(p.structure,null)}<button class="btn" id="saveTrainingBtn" onclick="saveTraining()"><i data-lucide="save"></i>${p.id?'Aggiorna seduta':'Salva seduta'}</button>`);
  }

  window.useTemplateStructure=function(templateId){
    const t=templates.find(x=>String(x.id)===String(templateId));if(!t)return;
    const p={id:null,session_date:document.getElementById('trDate')?.value||today(),title:document.getElementById('trTitle')?.value.trim()||t.title,duration_minutes:Number(document.getElementById('trDuration')?.value||t.duration_minutes||60),player_count:Number(document.getElementById('trPlayers')?.value||t.player_count||P.length||17),coach_count:Number(document.getElementById('trCoaches')?.value||t.coach_count||3),objective:document.getElementById('trObjective')?.value||t.objective,intensity:document.getElementById('trIntensity')?.value||t.intensity,style:document.getElementById('trStyle')?.value||t.style,notes:document.getElementById('trNotes')?.value.trim()||t.notes||null,structure:JSON.parse(JSON.stringify(t.structure||[])),is_template:false};
    window.__pendingTraining=p;closeM();previewPendingTraining();
  };

  window.saveTraining=async function(){
    if(!client||!user||!window.__pendingTraining)return;
    const btn=document.getElementById('saveTrainingBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const p={...window.__pendingTraining};const id=p.id;delete p.id;let error=null;
    if(id)({error}=await client.from('training_sessions').update({...p,updated_at:new Date().toISOString()}).eq('id',id)); else ({error}=await client.from('training_sessions').insert({...p,owner_user_id:user.id}));
    if(error){console.error('training save',error);alert('Impossibile salvare la seduta.');if(btn){btn.disabled=false;btn.textContent=id?'Aggiorna seduta':'Salva seduta';}return;}
    if(typeof window.osgbArchiveAiExercises==='function'){
      try{await window.osgbArchiveAiExercises(p.structure||[]);}catch(e){console.warn('AI exercise archive',e);}
    }
    window.__pendingTraining=null;closeM();await loadSessions();go('train');
  };

  window.openTraining=function(id){
    const s=sessions.find(x=>String(x.id)===String(id));if(!s)return;const structure=Array.isArray(s.structure)?s.structure:[];
    modal(`<div class="mh"><h3>${esc(s.title)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p>${fmt(s.session_date)} · ${s.duration_minutes||60} min</p><p class="muted">${s.player_count||P.length} bambini · ${s.coach_count||3} istruttori · ${esc(s.objective||'')}${s.intensity?' · Intensità '+esc(s.intensity):''}</p>${structureHtml(structure,s.id)}${s.notes?`<p class="muted">${esc(s.notes)}</p>`:''}<div class="row" style="margin-top:14px;gap:8px;display:flex;flex-wrap:wrap"><button class="btn alt" onclick='editTraining(${JSON.stringify(String(s.id))})'><i data-lucide="pencil"></i>Modifica</button><button class="btn alt" onclick='saveTrainingAsTemplate(${JSON.stringify(String(s.id))})'><i data-lucide="bookmark-plus"></i>Salva come modello</button><button class="btn alt" onclick='deleteTraining(${JSON.stringify(String(s.id))})'><i data-lucide="trash-2"></i>Elimina</button></div>`);
  };

  window.moveTrainingBlock=async function(id,index,dir){
    const s=sessions.find(x=>String(x.id)===String(id));if(!s)return;const arr=JSON.parse(JSON.stringify(s.structure||[])),to=index+dir;if(to<0||to>=arr.length)return;
    [arr[index],arr[to]]=[arr[to],arr[index]];arr.forEach((x,i)=>x.order=i+1);
    const {error}=await client.from('training_sessions').update({structure:arr,updated_at:new Date().toISOString()}).eq('id',id);if(error){alert('Impossibile riordinare la seduta.');return;}s.structure=arr;closeM();openTraining(id);
  };

  window.replaceTrainingExercise=function(id,blockIndex,stationIndex){
    const lib=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];if(!lib.length){alert('L’archivio esercizi è vuoto.');return;}
    const list=lib.map(ex=>`<button class="card" style="display:block;width:100%;text-align:left;margin-top:8px" onclick='applyTrainingReplacement(${JSON.stringify(String(id))},${blockIndex},${stationIndex===null?'null':stationIndex},${JSON.stringify(String(ex.id))})'><b>${esc(ex.title)}</b><br><small class="muted">${esc(ex.category||'Esercizio')}${ex.duration_minutes?' · '+ex.duration_minutes+' min':''}</small></button>`).join('');
    closeM();modal(`<div class="mh"><h3>SOSTITUISCI ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Scegli un esercizio dall’archivio.</p>${list}`);
  };

  window.applyTrainingReplacement=async function(id,blockIndex,stationIndex,exerciseId){
    const s=sessions.find(x=>String(x.id)===String(id));const ex=(window.osgbExerciseLibrary||[]).find(x=>String(x.id)===String(exerciseId));if(!s||!ex)return;
    const arr=JSON.parse(JSON.stringify(s.structure||[]));
    if(stationIndex!==null&&arr[blockIndex]?.source==='stations'){
      const old=arr[blockIndex].stations[stationIndex]||{};arr[blockIndex].stations[stationIndex]={...old,...exercisePayload(ex),station:old.station||stationIndex+1,group_size:old.group_size};
    }else{
      const old=arr[blockIndex]||{};arr[blockIndex]={...old,...exercisePayload(ex),source:'library',duration_minutes:Number(ex.duration_minutes)||Number(old.duration_minutes)||10};
    }
    const {error}=await client.from('training_sessions').update({structure:arr,updated_at:new Date().toISOString()}).eq('id',id);if(error){alert('Impossibile sostituire l’esercizio.');return;}s.structure=arr;closeM();openTraining(id);
  };

  window.saveTrainingAsTemplate=async function(id){
    const s=sessions.find(x=>String(x.id)===String(id));if(!s||!client||!user)return;
    const name=prompt('Nome del modello:',`Modello · ${s.title}`);if(!name)return;
    const row={owner_user_id:user.id,is_template:true,session_date:null,title:name,duration_minutes:s.duration_minutes,objective:s.objective,intensity:s.intensity,style:s.style,notes:s.notes,structure:s.structure||[],player_count:s.player_count,coach_count:s.coach_count};
    const {error}=await client.from('training_sessions').insert(row);if(error){alert('Impossibile salvare il modello.');return;}await loadSessions();closeM();go('train');
  };

  window.openTrainingTemplates=function(){
    const list=templates.length?templates.map(t=>`<div class="event"><div class="body"><strong>${esc(t.title)}</strong><small>${t.duration_minutes||60} min${t.objective?' · '+esc(t.objective):''}</small></div><button class="btn alt" onclick='useTrainingTemplate(${JSON.stringify(String(t.id))})'>Usa</button><button class="btn alt" onclick='deleteTrainingTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="trash-2"></i></button></div>`).join(''):`<p class="muted">Nessun modello salvato.</p>`;
    modal(`<div class="mh"><h3>MODELLI ALLENAMENTO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Salva le sedute migliori e riutilizzale adattando data, bambini e istruttori.</p>${list}`);
  };

  window.useTrainingTemplate=function(id){const t=templates.find(x=>String(x.id)===String(id));if(!t)return;closeM();trainingWizard(t,'template');};
  window.deleteTrainingTemplate=async function(id){const t=templates.find(x=>String(x.id)===String(id));if(!t||!confirm(`Eliminare il modello "${t.title}"?`))return;const {error}=await client.from('training_sessions').delete().eq('id',id);if(error){alert('Impossibile eliminare il modello.');return;}await loadSessions();closeM();openTrainingTemplates();};
  window.editTraining=function(id){const s=sessions.find(x=>String(x.id)===String(id));if(!s)return;closeM();trainingWizard(s);};
  window.deleteTraining=async function(id){const s=sessions.find(x=>String(x.id)===String(id));if(!s||!confirm(`Eliminare la seduta "${s.title}"?`))return;const {error}=await client.from('training_sessions').delete().eq('id',id);if(error){alert('Impossibile eliminare la seduta.');return;}closeM();await loadSessions();go('train');};

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;await loadSessions();});
  window.addEventListener('osgb-exercises-updated',()=>{if(S.r==='train')render();});
})();
