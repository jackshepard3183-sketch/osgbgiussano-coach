(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const blockLabel=b=>b?.source==='stations'?'Circuito a stazioni':(b?.title||'Blocco');
  const pending=()=>window.__pendingTraining||null;
  const totalMinutes=p=>(p?.structure||[]).reduce((n,b)=>n+(Number(b?.duration_minutes)||0),0);

  function editorHtml(){
    const p=pending();if(!p)return '';
    const blocks=(p.structure||[]).map((b,i)=>`<div class="card" style="margin-top:8px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b>${i+1}. ${esc(blockLabel(b))}</b><br><small class="muted">${Number(b.duration_minutes)||0} min${b.source==='library'?' · archivio':''}${b.source==='stations'?' · stazioni':''}</small></div><button class="sbtn" onclick="movePendingTrainingBlock(${i},-1)" ${i===0?'disabled':''} title="Sposta su"><i data-lucide="arrow-up"></i></button><button class="sbtn" onclick="movePendingTrainingBlock(${i},1)" ${i===p.structure.length-1?'disabled':''} title="Sposta giù"><i data-lucide="arrow-down"></i></button>${b.source!=='stations'?`<button class="sbtn" onclick="replacePendingTrainingBlock(${i})" title="Sostituisci"><i data-lucide="repeat-2"></i></button>`:''}</div></div>`).join('');
    const sum=totalMinutes(p),target=Number(p.duration_minutes)||sum;
    const mismatch=sum!==target?`<div class="card yellow" style="margin-top:10px"><b>Durata da controllare</b><p class="muted">I blocchi sommano ${sum} min, mentre la seduta è impostata a ${target} min.</p><button class="btn alt" onclick="syncPendingTrainingDuration()">Usa ${sum} min come durata seduta</button></div>`:'';
    return `<div class="mh"><h3>PERSONALIZZA SEDUTA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Riordina i blocchi o sostituisci un esercizio prima di salvare.</p><div class="grid g2"><div class="card"><div class="muted">DURATA SEDUTA</div><div class="kpi">${target}'</div></div><div class="card"><div class="muted">SOMMA BLOCCHI</div><div class="kpi">${sum}'</div></div></div>${mismatch}${blocks}<button class="btn" style="margin-top:12px" onclick="saveTraining()"><i data-lucide="save"></i>Salva seduta</button>`;
  }

  window.editPendingTrainingStructure=function(){if(!pending())return;closeM();modal(editorHtml());};
  window.movePendingTrainingBlock=function(i,delta){const p=pending();if(!p)return;const j=i+delta;if(j<0||j>=p.structure.length)return;[p.structure[i],p.structure[j]]=[p.structure[j],p.structure[i]];p.structure.forEach((b,k)=>b.order=k+1);closeM();modal(editorHtml());};
  window.replacePendingTrainingBlock=function(i){
    const p=pending(),lib=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];if(!p)return;
    if(!lib.length){alert('Archivio esercizi vuoto.');return;}
    closeM();modal(`<div class="mh"><h3>SOSTITUISCI ESERCIZIO</h3><button class="close" onclick="editPendingTrainingStructure()"><i data-lucide="x"></i></button></div><p class="muted">La durata del blocco viene mantenuta, così la durata totale della seduta non cambia.</p>${lib.map(ex=>`<div class="event"><div class="body"><strong>${esc(ex.title)}</strong><small>${esc(ex.category||'')}${ex.duration_minutes?' · archivio '+ex.duration_minutes+' min':''}</small></div><button class="btn alt" onclick='choosePendingTrainingReplacement(${i},${JSON.stringify(String(ex.id))})'>Usa</button></div>`).join('')}`);
  };
  window.choosePendingTrainingReplacement=function(i,exId){
    const ex=(window.osgbExerciseLibrary||[]).find(x=>String(x.id)===String(exId)),p=pending();if(!ex||!p)return;
    const old=p.structure[i]||{},duration=Number(old.duration_minutes)||Number(ex.duration_minutes)||10;
    p.structure[i]={order:i+1,title:ex.title,duration_minutes:duration,exercise_id:ex.id,category:ex.category||null,objective:ex.objective||null,space:ex.space||null,equipment:ex.equipment||null,description:ex.description||null,variants:ex.variants||null,source:'library'};
    closeM();modal(editorHtml());
  };
  window.syncPendingTrainingDuration=function(){const p=pending();if(!p)return;p.duration_minutes=totalMinutes(p);closeM();modal(editorHtml());};

  const oldGen=window.genTrain;
  window.genTrain=function(editId){
    if(typeof oldGen==='function')oldGen(editId);
    const sheet=document.querySelector('#m .sheet');
    if(sheet&&pending()){
      const save=document.getElementById('saveTrainingBtn');
      if(save&&!document.getElementById('editPendingStructureBtn'))save.insertAdjacentHTML('beforebegin','<button id="editPendingStructureBtn" class="btn alt" style="margin:0 8px 10px 0" onclick="editPendingTrainingStructure()"><i data-lucide="sliders-horizontal"></i>Personalizza struttura</button>');
      if(window.lucide)lucide.createIcons();
    }
  };
})();
