(function(){
  let client=null;
  let counts={};
  let proposal=null;
  let quickSelected=new Set();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const profile=p=>typeof window.osgbDevelopmentBadge==='function'?window.osgbDevelopmentBadge(p):'Profilo da definire';
  const empty=()=>({total:0,BLU:0,GIALLA:0});

  function weight(p){
    const dev={initial:0,growing:1,consolidated:2}[p.developmentLevel]??1;
    const exp={first_year:0,second_year:1}[p.experienceLevel]??0.5;
    return dev+exp*0.75;
  }

  async function loadCounts(){
    if(!client)return;
    const {data,error}=await client.from('callups').select('player_id,team_color');
    if(error){console.error('callup counts',error);return;}
    const next={};
    for(const p of P)next[p.id]=empty();
    for(const r of (data||[])){
      const c=next[r.player_id]||(next[r.player_id]=empty());
      c.total++;
      if(r.team_color==='BLU')c.BLU++;
      if(r.team_color==='GIALLA')c.GIALLA++;
    }
    counts=next;
    window.osgbCallupCounts=counts;
    if(S.r==='builder'||S.r==='team')render();
  }

  function choosePlayers(total){
    return [...P].sort((a,b)=>{
      const ca=counts[a.id]||empty(),cb=counts[b.id]||empty();
      return ca.total-cb.total || String(a.n).localeCompare(String(b.n),'it');
    }).slice(0,Math.max(0,Math.min(total,P.length)));
  }

  function balance(selected,bluTarget,giallaTarget){
    const sorted=[...selected].sort((a,b)=>weight(b)-weight(a) || (counts[a.id]?.total||0)-(counts[b.id]?.total||0));
    const out={BLU:[],GIALLA:[]};
    let strength={BLU:0,GIALLA:0};
    for(const p of sorted){
      const options=[];
      if(out.BLU.length<bluTarget)options.push('BLU');
      if(out.GIALLA.length<giallaTarget)options.push('GIALLA');
      if(!options.length)break;
      let team=options[0];
      if(options.length===2){
        const c=counts[p.id]||empty();
        const avgB=out.BLU.length?strength.BLU/out.BLU.length:0;
        const avgG=out.GIALLA.length?strength.GIALLA/out.GIALLA.length:0;
        const historyBias=(c.BLU-c.GIALLA)*0.18;
        team=avgB+historyBias<=avgG-historyBias?'BLU':'GIALLA';
      }
      out[team].push(p);strength[team]+=weight(p);
    }
    return out;
  }

  function renderPreview(){
    if(!proposal)return;
    const row=(p,team)=>{const c=counts[p.id]||empty();return `<div class="assign"><div class="av">${p.seq||P.indexOf(p)+1}</div><div style="flex:1"><b>${esc(p.n)}</b><br><small class="muted">${esc(profile(p))} · ${c.total} convocazioni</small></div><button class="mn" onclick='moveProposalPlayer(${JSON.stringify(String(p.id))},${JSON.stringify(team)})'><i data-lucide="shuffle"></i></button></div>`;};
    const selected=proposal.BLU.length+proposal.GIALLA.length;
    modal(`<div class="mh"><h3>PROPOSTA EQUILIBRATA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Selezione basata prima sull’equità delle convocazioni; distribuzione basata su esperienza e livello di sviluppo. Puoi spostare i bambini prima di salvare.</p><div class="grid g3"><div class="card"><b>Convocati</b><div class="kpi">${selected}</div></div><div class="card blue"><b>BLU</b><div class="kpi">${proposal.BLU.length}</div></div><div class="card yellow"><b>GIALLA</b><div class="kpi">${proposal.GIALLA.length}</div></div></div><div class="builder" style="margin-top:12px"><div class="box b"><h3>BLU</h3>${proposal.BLU.map(p=>row(p,'BLU')).join('')}</div><div class="box y"><h3>GIALLA</h3>${proposal.GIALLA.map(p=>row(p,'GIALLA')).join('')}</div></div><button class="btn" id="applyProposalBtn" onclick="applyGuidedCallups()"><i data-lucide="check"></i>Applica composizione</button>`);
  }

  window.openGuidedCallups=function(){
    if(!S.match){alert('Apri prima una gara dal Calendario.');return;}
    const half=Math.floor(P.length/2);
    modal(`<div class="mh"><h3>COMPOSIZIONE GUIDATA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Indica quanti bambini vuoi convocare per ciascuna squadra.</p><div class="grid g2"><div class="field"><label>BLU</label><input id="guideBlu" type="number" min="0" max="${P.length}" value="${half}"></div><div class="field"><label>GIALLA</label><input id="guideGialla" type="number" min="0" max="${P.length}" value="${P.length-half}"></div></div><button class="btn" onclick="generateGuidedCallups()"><i data-lucide="scale"></i>Genera proposta</button>`);
  };

  window.generateGuidedCallups=function(){
    const blu=Math.max(0,parseInt(document.getElementById('guideBlu')?.value||'0',10)||0);
    const gialla=Math.max(0,parseInt(document.getElementById('guideGialla')?.value||'0',10)||0);
    if(blu+gialla>P.length){alert(`Puoi convocare al massimo ${P.length} bambini.`);return;}
    proposal=balance(choosePlayers(blu+gialla),blu,gialla);
    closeM();renderPreview();
  };

  window.moveProposalPlayer=function(id,from){
    if(!proposal)return;
    const to=from==='BLU'?'GIALLA':'BLU';
    const idx=proposal[from].findIndex(p=>String(p.id)===String(id));
    if(idx<0)return;
    const [p]=proposal[from].splice(idx,1);proposal[to].push(p);
    closeM();renderPreview();
  };

  window.applyGuidedCallups=async function(){
    if(!client||!S.match||!proposal)return;
    const assignments=[...proposal.BLU.map(p=>({player_id:p.id,team_color:'BLU'})),...proposal.GIALLA.map(p=>({player_id:p.id,team_color:'GIALLA'}))];
    const btn=document.getElementById('applyProposalBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.rpc('osgb_replace_event_callups',{p_event_id:S.match,p_assignments:assignments});
    if(error){console.error('guided callups save',error);alert('Impossibile salvare la composizione.');if(btn){btn.disabled=false;btn.textContent='Applica composizione';}return;}
    S.asg[S.match]=Object.fromEntries(assignments.map(x=>[x.player_id,x.team_color]));proposal=null;
    await loadCounts();closeM();go('builder');
  };

  window.assignAllBalanced=function(){
    if(!S.match){alert('Apri prima una gara dal Calendario.');return;}
    const blu=Math.floor(P.length/2),gialla=P.length-blu;
    proposal=balance(choosePlayers(P.length),blu,gialla);renderPreview();
  };

  window.openQuickCallups=function(){
    if(!S.match){alert('Apri prima una gara dal Calendario.');return;}
    quickSelected=new Set();
    renderQuickCallups();
  };

  function renderQuickCallups(){
    const current=S.asg[S.match]||{};
    const rows=P.map(p=>{const c=counts[p.id]||empty();const checked=quickSelected.has(String(p.id));return `<label class="player" style="cursor:pointer"><input type="checkbox" ${checked?'checked':''} onchange='toggleQuickPlayer(${JSON.stringify(String(p.id))},this.checked)' style="width:20px;height:20px"><div class="av">${p.seq||P.indexOf(p)+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>${esc(profile(p))} · ${c.total} convocazioni</small></div><span class="pill ${current[p.id]==='GIALLA'?'yellow':''}">${esc(current[p.id]||'—')}</span></label>`;}).join('');
    modal(`<div class="mh"><h3>SELEZIONE RAPIDA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Seleziona più bambini e assegnali insieme. Le assegnazioni già presenti restano invariate per gli altri.</p><div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="selectQuickAll()">Seleziona tutti</button><button class="btn alt" onclick="clearQuickSelection()">Deseleziona</button></div><div style="margin-top:12px">${rows}</div><div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" onclick="assignQuickSelected('BLU')">Selezionati → BLU</button><button class="btn yellow" onclick="assignQuickSelected('GIALLA')">Selezionati → GIALLA</button></div>`);
  }

  window.toggleQuickPlayer=function(id,on){on?quickSelected.add(String(id)):quickSelected.delete(String(id));};
  window.selectQuickAll=function(){quickSelected=new Set(P.map(p=>String(p.id)));closeM();renderQuickCallups();};
  window.clearQuickSelection=function(){quickSelected.clear();closeM();renderQuickCallups();};
  window.assignQuickSelected=async function(team){
    if(!client||!S.match||!quickSelected.size)return;
    const current={...(S.asg[S.match]||{})};
    for(const id of quickSelected)current[id]=team;
    const assignments=Object.entries(current).filter(([,t])=>t==='BLU'||t==='GIALLA').map(([player_id,team_color])=>({player_id,team_color}));
    const {error}=await client.rpc('osgb_replace_event_callups',{p_event_id:S.match,p_assignments:assignments});
    if(error){alert('Impossibile aggiornare le convocazioni.');return;}
    S.asg[S.match]=current;quickSelected.clear();await loadCounts();closeM();go('builder');
  };

  window.clearCallups=async function(){
    if(!client||!S.match)return;
    if(!confirm('Svuotare la composizione BLU/GIALLA di questa gara?'))return;
    const {error}=await client.rpc('osgb_replace_event_callups',{p_event_id:S.match,p_assignments:[]});
    if(error){alert('Impossibile svuotare la composizione.');return;}
    S.asg[S.match]={};await loadCounts();go('builder');
  };

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(client)await loadCounts();});
  window.addEventListener('osgb-roster-updated',()=>{if(client)loadCounts();});
  window.osgbReloadCallupCounts=loadCounts;
})();
