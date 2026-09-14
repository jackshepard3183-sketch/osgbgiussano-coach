(function(){
  let client=null,user=null,templates=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);

  async function loadTemplates(){
    if(!client)return;
    const {data,error}=await client.from('training_templates').select('id,title,duration_minutes,player_count,coach_count,objective,intensity,style,notes,structure,created_at').order('created_at',{ascending:false});
    if(error){console.error('template load',error);return;}
    templates=data||[];
  }

  function blockLabel(b){return b.source==='stations'?'Circuito a stazioni':(b.title||'Blocco');}
  function editorHtml(){
    const p=window.__pendingTraining;if(!p)return '';
    const blocks=(p.structure||[]).map((b,i)=>`<div class="card" style="margin-top:8px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1"><b>${i+1}. ${esc(blockLabel(b))}</b><br><small class="muted">${b.duration_minutes||0} min${b.source==='library'?' · archivio':''}</small></div><button class="sbtn" onclick="moveTrainingBlock(${i},-1)" ${i===0?'disabled':''}><i data-lucide="arrow-up"></i></button><button class="sbtn" onclick="moveTrainingBlock(${i},1)" ${i===p.structure.length-1?'disabled':''}><i data-lucide="arrow-down"></i></button>${b.source!=='stations'?`<button class="sbtn" onclick="replaceTrainingBlock(${i})"><i data-lucide="repeat-2"></i></button>`:''}</div></div>`).join('');
    return `<div class="mh"><h3>PERSONALIZZA SEDUTA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Riordina i blocchi o sostituisci un esercizio prima di salvare.</p>${blocks}<button class="btn" style="margin-top:12px" onclick="saveTraining()"><i data-lucide="save"></i>Salva seduta</button>`;
  }

  window.editPendingTrainingStructure=function(){if(!window.__pendingTraining)return;closeM();modal(editorHtml());};
  window.moveTrainingBlock=function(i,delta){const p=window.__pendingTraining;if(!p)return;const j=i+delta;if(j<0||j>=p.structure.length)return;[p.structure[i],p.structure[j]]=[p.structure[j],p.structure[i]];p.structure.forEach((b,k)=>b.order=k+1);closeM();modal(editorHtml());};
  window.replaceTrainingBlock=function(i){
    const lib=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];
    if(!lib.length){alert('Archivio esercizi vuoto.');return;}
    closeM();
    modal(`<div class="mh"><h3>SOSTITUISCI ESERCIZIO</h3><button class="close" onclick="editPendingTrainingStructure()"><i data-lucide="x"></i></button></div>${lib.map(ex=>`<div class="event"><div class="body"><strong>${esc(ex.title)}</strong><small>${esc(ex.category||'')} ${ex.duration_minutes?'· '+ex.duration_minutes+' min':''}</small></div><button class="btn alt" onclick='chooseTrainingReplacement(${i},${JSON.stringify(String(ex.id))})'>Usa</button></div>`).join('')}`);
  };
  window.chooseTrainingReplacement=function(i,exId){
    const ex=(window.osgbExerciseLibrary||[]).find(x=>String(x.id)===String(exId));const p=window.__pendingTraining;if(!ex||!p)return;
    const old=p.structure[i]||{};
    p.structure[i]={order:i+1,title:ex.title,duration_minutes:old.duration_minutes||ex.duration_minutes||10,exercise_id:ex.id,category:ex.category||null,objective:ex.objective||null,space:ex.space||null,equipment:ex.equipment||null,description:ex.description||null,variants:ex.variants||null,source:'library'};
    closeM();modal(editorHtml());
  };

  window.saveTrainingAsTemplate=async function(sessionId){
    if(!client||!user)return;
    const {data,error}=await client.from('training_sessions').select('title,duration_minutes,player_count,coach_count,objective,intensity,style,notes,structure').eq('id',sessionId).single();
    if(error||!data){alert('Impossibile leggere la seduta.');return;}
    const row={...data,owner_user_id:user.id,title:data.title.replace(/^Modello · /,'')};
    const {error:ie}=await client.from('training_templates').insert(row);
    if(ie){alert('Impossibile salvare il modello.');return;}
    await loadTemplates();alert('Modello salvato.');
  };

  window.trainingTemplates=function(){
    const list=templates.length?templates.map(t=>`<div class="event"><div class="body"><strong>${esc(t.title)}</strong><small>${t.duration_minutes||60} min${t.objective?' · '+esc(t.objective):''}</small></div><button class="btn alt" onclick='useTrainingTemplate(${JSON.stringify(String(t.id))})'>Usa</button><button class="sbtn" onclick='deleteTrainingTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="trash-2"></i></button></div>`).join(''):`<p class="muted">Nessun modello salvato.</p>`;
    modal(`<div class="mh"><h3>MODELLI SEDUTA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>${list}`);
  };
  window.useTrainingTemplate=function(id){
    const t=templates.find(x=>String(x.id)===String(id));if(!t)return;
    window.__pendingTraining={id:null,session_date:today(),title:t.title,duration_minutes:t.duration_minutes||60,player_count:t.player_count||P.length||17,coach_count:t.coach_count||3,objective:t.objective||'Gioco e collaborazione',intensity:t.intensity||'Media',style:t.style||'Scuola Calcio',notes:t.notes||null,structure:Array.isArray(t.structure)?JSON.parse(JSON.stringify(t.structure)):[]};
    closeM();modal(editorHtml());
  };
  window.deleteTrainingTemplate=async function(id){if(!client||!confirm('Eliminare questo modello?'))return;const {error}=await client.from('training_templates').delete().eq('id',id);if(error){alert('Impossibile eliminare il modello.');return;}await loadTemplates();closeM();trainingTemplates();};

  const oldTrain=window.train;
  window.train=function(){const html=typeof oldTrain==='function'?oldTrain():'';return `${html}<div class="card" style="margin-top:12px"><b>Modelli seduta</b><p class="muted">Salva e riutilizza strutture di allenamento già collaudate.</p><button class="btn alt" onclick="trainingTemplates()"><i data-lucide="bookmark"></i>Apri modelli</button></div>`;};

  const oldOpen=window.openTraining;
  window.openTraining=function(id){if(typeof oldOpen==='function')oldOpen(id);const sheet=document.querySelector('#m .sheet');if(sheet){sheet.insertAdjacentHTML('beforeend',`<button class="btn alt" style="margin-top:10px" onclick='saveTrainingAsTemplate(${JSON.stringify(String(id))})'><i data-lucide="bookmark-plus"></i>Salva come modello</button>`);if(window.lucide)lucide.createIcons();}};

  const oldGen=window.genTrain;
  window.genTrain=function(editId){if(typeof oldGen==='function')oldGen(editId);const sheet=document.querySelector('#m .sheet');if(sheet&&window.__pendingTraining){const save=document.getElementById('saveTrainingBtn');if(save)save.insertAdjacentHTML('beforebegin','<button class="btn alt" style="margin:0 8px 10px 0" onclick="editPendingTrainingStructure()"><i data-lucide="sliders-horizontal"></i>Personalizza struttura</button>');if(window.lucide)lucide.createIcons();}};

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;await loadTemplates();});
})();