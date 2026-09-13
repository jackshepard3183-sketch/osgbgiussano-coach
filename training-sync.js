(function(){
  let client=null,user=null,sessions=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{if(!d)return'';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const today=()=>new Date().toISOString().slice(0,10);
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  async function loadSessions(){
    if(!client)return;
    const {data,error}=await client.from('training_sessions').select('id,session_date,title,duration_minutes,objective,intensity,style,notes,structure,created_at').order('session_date',{ascending:false}).order('created_at',{ascending:false});
    if(error){console.error('training load',error);return;}
    sessions=data||[];
    if(S.r==='train')render();
  }

  function scoreExercise(ex,objective){
    const q=norm(objective).split(/\s+/).filter(w=>w.length>3);
    const hay=norm([ex.title,ex.category,ex.objective,ex.description].filter(Boolean).join(' '));
    return q.reduce((n,w)=>n+(hay.includes(w)?1:0),0);
  }

  function buildStructure(total,objective){
    const lib=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];
    const usable=lib.filter(x=>Number(x.duration_minutes)>0).map(x=>({...x,_score:scoreExercise(x,objective)})).sort((a,b)=>b._score-a._score);
    const blocks=[];
    let used=0;
    const warm=Math.min(total>=75?12:10,total);
    blocks.push({order:1,title:'Attivazione ludico-motoria',duration_minutes:warm,source:'fallback'});used+=warm;
    const targetForExercises=Math.max(0,total-(used+15));
    for(const ex of usable){
      const d=Number(ex.duration_minutes)||0;
      if(!d||used+d>used+targetForExercises)continue;
      blocks.push({order:blocks.length+1,title:ex.title,duration_minutes:d,exercise_id:ex.id,category:ex.category||null,objective:ex.objective||null,space:ex.space||null,equipment:ex.equipment||null,description:ex.description||null,variants:ex.variants||null,source:'library'});
      used+=d;
      if(used>=total-20)break;
    }
    const remaining=total-used;
    if(remaining>10){
      const theme=Math.max(10,remaining-10);
      blocks.push({order:blocks.length+1,title:objective,duration_minutes:theme,source:'fallback'});used+=theme;
    }
    if(used<total){blocks.push({order:blocks.length+1,title:'Partita finale / gioco libero',duration_minutes:total-used,source:'fallback'});}
    return blocks;
  }

  window.train=function(){
    const list=sessions.length?sessions.map(s=>`<div class="event"><div class="date"><b>${fmt(s.session_date)||'—'}</b></div><div class="body"><strong>${esc(s.title)}</strong><small>${s.duration_minutes||60} min${s.objective?' · '+esc(s.objective):''}</small></div><button class="btn alt" onclick='openTraining(${JSON.stringify(String(s.id))})'><i data-lucide="chevron-right"></i>Apri</button></div>`).join(''):`<p class="muted">Nessuna seduta salvata.</p>`;
    const exCount=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary.length:0;
    return `${ttl('Allenamenti','Crea, salva e riutilizza le sedute')}<div class="grid g2"><div class="card blue"><div class="muted">ROSA ATTIVA</div><div class="kpi">${P.length}</div><p>bambini disponibili</p></div><div class="card yellow"><b>Archivio esercizi</b><p class="muted">${exCount} esercizi disponibili</p><button class="btn alt" onclick="exercises()"><i data-lucide="library"></i>Apri esercizi</button></div></div><div class="section">SEDUTE SALVATE</div><div class="card">${list}</div><button class="btn" style="margin-top:12px" onclick="trainingWizard()"><i data-lucide="sparkles"></i>Crea seduta</button>`;
  };

  window.trainingWizard=function(){
    modal(`<div class="mh"><h3>CREA ALLENAMENTO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Data</label><input id="trDate" type="date" value="${today()}"></div>
      <div class="field"><label>Titolo</label><input id="trTitle" value="Seduta OSGB 2020"></div>
      <div class="field"><label>Durata</label><select id="trDuration"><option value="60">60 min</option><option value="75">75 min</option><option value="90">90 min</option></select></div>
      <div class="field"><label>Obiettivo</label><select id="trObjective"><option>Conduzione e 1 contro 1</option><option>Coordinazione</option><option>Passaggio e ricezione</option><option>Finalizzazione</option><option>Gioco e collaborazione</option></select></div>
      <div class="field"><label>Intensità</label><select id="trIntensity"><option>Bassa</option><option selected>Media</option><option>Alta</option></select></div>
      <div class="field"><label>Stile</label><select id="trStyle"><option selected>Scuola Calcio</option><option>Gioco libero</option><option>Tecnico</option></select></div>
      <div class="field"><label>Note</label><input id="trNotes" placeholder="Note facoltative"></div>
      <p class="muted">Il generatore usa prima gli esercizi salvati nell’archivio e completa il tempo restante con blocchi standard.</p>
      <button class="btn" onclick="genTrain()"><i data-lucide="sparkles"></i>Genera struttura</button>`);
  };

  window.genTrain=function(){
    const duration=parseInt(document.getElementById('trDuration')?.value||'60',10);
    const objective=document.getElementById('trObjective')?.value||'Seduta';
    window.__pendingTraining={
      session_date:document.getElementById('trDate')?.value||today(),
      title:document.getElementById('trTitle')?.value.trim()||'Seduta OSGB 2020',
      duration_minutes:duration,
      objective,
      intensity:document.getElementById('trIntensity')?.value||null,
      style:document.getElementById('trStyle')?.value||null,
      notes:document.getElementById('trNotes')?.value.trim()||null,
      structure:buildStructure(duration,objective)
    };
    closeM();
    const p=window.__pendingTraining;
    modal(`<div class="mh"><h3>SEDUTA GENERATA · ${p.duration_minutes}'</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>${p.structure.map(x=>`<div class="event"><div class="date">${x.duration_minutes} min</div><div class="body"><strong>${esc(x.title)}</strong><small>${x.source==='library'?'Da archivio esercizi':'Blocco standard'}${x.category?' · '+esc(x.category):''}</small></div></div>`).join('')}<button class="btn" id="saveTrainingBtn" onclick="saveTraining()"><i data-lucide="save"></i>Salva seduta</button>`);
  };

  window.saveTraining=async function(){
    if(!client||!user||!window.__pendingTraining)return;
    const btn=document.getElementById('saveTrainingBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const row={...window.__pendingTraining,owner_user_id:user.id};
    const {error}=await client.from('training_sessions').insert(row);
    if(error){console.error('training save',error);alert('Impossibile salvare la seduta.');if(btn){btn.disabled=false;btn.textContent='Salva seduta';}return;}
    window.__pendingTraining=null;closeM();await loadSessions();go('train');
  };

  window.openTraining=function(id){
    const s=sessions.find(x=>String(x.id)===String(id));if(!s)return;
    const structure=Array.isArray(s.structure)?s.structure:[];
    modal(`<div class="mh"><h3>${esc(s.title)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p>${fmt(s.session_date)} · ${s.duration_minutes||60} min</p><p class="muted">${esc(s.objective||'')}${s.intensity?' · Intensità '+esc(s.intensity):''}</p>${structure.map(x=>`<div class="event"><div class="date">${esc(x.duration_minutes||'')} min</div><div class="body"><strong>${esc(x.title||'Esercizio')}</strong><small>${x.source==='library'?'Da archivio esercizi':'Blocco standard'}${x.space?' · '+esc(x.space):''}</small></div></div>`).join('')}${s.notes?`<p class="muted">${esc(s.notes)}</p>`:''}`);
  };

  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user||null;
    await loadSessions();
  });
  window.addEventListener('osgb-exercises-updated',()=>{if(S.r==='train')render();});
})();