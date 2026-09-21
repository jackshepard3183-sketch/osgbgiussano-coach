(function(){
  let client=null;
  let stats={};
  let rosterQuery='';
  let rosterSort='name';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const waitRoster=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(P.length||n>40){clearInterval(t);resolve();}},100)});
  const fmtDate=d=>{if(!d)return'—';const x=String(d).slice(0,10).split('-');return x.length===3?`${x[2]}/${x[1]}/${x[0]}`:String(d)};
  const statusLabel=s=>({present:'Presente',absent:'Assente',late:'Ritardo',unavailable:'Indisponibile'}[s]||s||'—');
  const profile=p=>typeof window.osgbDevelopmentBadge==='function'?window.osgbDevelopmentBadge(p):'Profilo da definire';
  function empty(){return {present:0,absent:0,late:0,unavailable:0,total:0,pct:0,history:[]};}

  async function loadStats(){
    if(!client)return;
    const {data,error}=await client.from('attendance').select('player_id,status,event_id,updated_at,events(event_date,title,event_type)').order('updated_at',{ascending:false});
    if(error){console.error('player stats load',error);return;}
    const next={};for(const p of P)next[p.id]=empty();
    for(const r of (data||[])){
      const s=next[r.player_id]||(next[r.player_id]=empty());
      if(r.status==='present')s.present++; else if(r.status==='absent')s.absent++; else if(r.status==='late')s.late++; else if(r.status==='unavailable')s.unavailable++;
      s.total++;s.history.push({status:r.status,date:r.events?.event_date||r.updated_at,title:r.events?.title||'Allenamento'});
    }
    for(const p of P){const s=next[p.id]||empty();s.pct=s.total?Math.round((s.present+s.late)/s.total*100):0;p.pct=s.pct;}
    stats=next;if(S.r==='team')render();
  }

  function visiblePlayers(){
    let list=P.filter(p=>String(p.n||'').toLowerCase().includes(rosterQuery.toLowerCase().trim()));
    list=[...list].sort((a,b)=>{const sa=stats[a.id]||empty(),sb=stats[b.id]||empty();if(rosterSort==='pct-desc')return sb.pct-sa.pct||String(a.n).localeCompare(String(b.n),'it');if(rosterSort==='pct-asc')return sa.pct-sb.pct||String(a.n).localeCompare(String(b.n),'it');if(rosterSort==='absences')return sb.absent-sa.absent||String(a.n).localeCompare(String(b.n),'it');return String(a.n).localeCompare(String(b.n),'it');});
    return list;
  }

  window.setRosterQuery=function(v){rosterQuery=String(v||'');render();};
  window.setRosterSort=function(v){rosterSort=v||'name';render();};

  window.team=function(){
    const a=S.asg[S.match]||{};const assigned=Object.values(a).filter(Boolean).length;const list=visiblePlayers();const toVerify=P.filter(p=>p.sourceMissing).length;
    const rows=list.length?list.map(p=>{const s=stats[p.id]||empty();const warning=p.sourceMissing?'<span class="pill yellow">DA VERIFICARE</span>':`<span class="pill ${a[p.id]==='GIALLA'?'yellow':''}">${esc(a[p.id]||'Non assegnato')}</span>`;return `<div class="player" onclick='openPlayerStats(${JSON.stringify(String(p.id))})' style="cursor:pointer"><div class="av">${p.seq||P.indexOf(p)+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>${esc(profile(p))} · Presenze ${s.pct}%</small></div>${warning}</div>`;}).join(''):`<p class="muted">Nessun giocatore trovato.</p>`;
    const sourceWarning=toVerify?`<div class="card yellow" style="margin-top:12px"><b>${toVerify} ${toVerify===1?'bambino da verificare':'bambini da verificare'}</b><p class="muted">Non risultano nella fonte iscrizioni dell’ultimo controllo. Non vengono rimossi automaticamente.</p><button class="btn alt" onclick="openRosterSync()"><i data-lucide="refresh-cw"></i>Controlla sincronizzazione</button></div>`:'';
    return `${ttl('Squadra',`${P.length} bambini · BLU e GIALLA dinamiche per ogni gara`)}<div class="grid g3"><div class="card"><div class="muted">ROSA</div><div class="kpi">${P.length}</div></div><div class="card"><div class="muted">ASSEGNATI ORA</div><div class="kpi">${assigned}</div></div><div class="card ${toVerify?'yellow':''}"><div class="muted">DA VERIFICARE</div><div class="kpi">${toVerify}</div></div></div>${sourceWarning}<div class="card" style="margin-top:12px"><p class="muted">Le squadre vengono composte per ogni singola gara. Il profilo di sviluppo serve solo a bilanciare i gruppi, non a creare classifiche.</p><button class="btn" onclick="go('builder')"><i data-lucide="users-round"></i>Componi BLU / GIALLA</button></div><div class="card" style="margin-top:12px"><div class="field"><label>Cerca giocatore</label><input value="${esc(rosterQuery)}" oninput="setRosterQuery(this.value)" placeholder="Nome o cognome"></div><div class="field"><label>Ordina</label><select onchange="setRosterSort(this.value)"><option value="name" ${rosterSort==='name'?'selected':''}>Nome</option><option value="pct-desc" ${rosterSort==='pct-desc'?'selected':''}>Presenza % decrescente</option><option value="pct-asc" ${rosterSort==='pct-asc'?'selected':''}>Presenza % crescente</option><option value="absences" ${rosterSort==='absences'?'selected':''}>Più assenze</option></select></div></div><div class="section">ROSA · ${list.length}</div>${rows}`;
  };

  window.builder=function(){
    const a=S.asg[S.match]||{},g={N:[],BLU:[],GIALLA:[]};P.forEach(p=>g[a[p.id]||'N'].push(p));
    const disabled=S.match?'':' disabled';
    const row=p=>`<div class="assign"><div class="av">${p.seq||P.indexOf(p)+1}</div><div style="flex:1"><b>${esc(p.n)}</b><br><small class="muted">${esc(profile(p))}${p.sourceMissing?' · Da verificare':''}</small></div><div class="acts"><button class="mb"${disabled} onclick='asg(${JSON.stringify(String(p.id))},"BLU")'>BLU</button><button class="my"${disabled} onclick='asg(${JSON.stringify(String(p.id))},"GIALLA")'>GIALLA</button><button class="mn"${disabled} onclick='asg(${JSON.stringify(String(p.id))},null)'>×</button></div></div>`;
    const matches=(S.events||[]).filter(e=>['Campionato','Amichevole','Torneo'].includes(e.type));
    const matchPicker=`<div class="card" style="margin-bottom:12px"><div class="field"><label>Gara da comporre</label><select id="builderMatch" onchange="osgbSelectCallupEvent(this.value)"><option value="">Seleziona una gara…</option>${matches.map(e=>`<option value="${esc(e.id)}" ${String(e.id)===String(S.match)?'selected':''}>${esc(fmtDate(e.date||e.d))} · ${esc(e.t||e.opponent||'Gara')} · ${esc(e.team||'')}</option>`).join('')}</select></div><p class="muted">Seleziona prima la gara, poi assegna ogni bambino a BLU o GIALLA.</p></div>`;
    const noMatch=!S.match?`<div class="card"><p class="muted">Apri prima una gara dal Calendario per comporre le squadre.</p><button class="btn alt" onclick="go('cal')">Vai al Calendario</button></div>`:'';
    const actions=S.match?`<div class="card" style="margin-top:12px"><div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="openGuidedCallups()"><i data-lucide="scale"></i>Proposta equilibrata</button><button class="btn alt" onclick="openQuickCallups()"><i data-lucide="list-checks"></i>Selezione rapida</button><button class="btn alt" onclick="assignAllBalanced()"><i data-lucide="shuffle"></i>Dividi tutti</button><button class="btn alt" onclick="clearCallups()"><i data-lucide="eraser"></i>Svuota</button></div><p class="muted" style="margin-top:10px">La proposta considera prima l’equità delle convocazioni e poi bilancia esperienza e livello tra BLU e GIALLA.</p></div>`:'';
    return `${ttl('BLU / GIALLA','Composizione dinamica della giornata')}${matchPicker}${noMatch}${actions}<div class="grid g3"><div class="card blue"><b>BLU</b><div class="kpi">${g.BLU.length}</div></div><div class="card yellow"><b>GIALLA</b><div class="kpi">${g.GIALLA.length}</div></div><div class="card"><b>Non assegnati</b><div class="kpi">${g.N.length}</div></div></div><div class="card" style="margin-top:12px"><b>Non assegnati: ${g.N.length}</b>${g.N.map(row).join('')}</div><div class="builder" style="margin-top:12px"><div class="box b"><h3>BLU · ${g.BLU.length}</h3>${g.BLU.map(row).join('')}</div><div class="box y"><h3>GIALLA · ${g.GIALLA.length}</h3>${g.GIALLA.map(row).join('')}</div></div>`;
  };

  window.openPlayerStats=function(id){
    const p=P.find(x=>String(x.id)===String(id));if(!p)return;const s=stats[p.id]||empty();
    const history=s.history.length?s.history.slice(0,20).map(h=>`<div class="event"><div class="date"><b>${fmtDate(h.date)}</b></div><div class="body"><strong>${esc(statusLabel(h.status))}</strong><small>${esc(h.title||'Allenamento')}</small></div></div>`).join(''):`<p class="muted">Nessuna rilevazione registrata.</p>`;
    const verify=p.sourceMissing?`<div class="card yellow" style="margin-bottom:12px"><b>DA VERIFICARE</b><p class="muted">Questo bambino non è stato trovato nella fonte iscrizioni durante l’ultima sincronizzazione. Nessuna cancellazione è stata effettuata.</p><button class="btn alt" onclick="closeM();openRosterSync()"><i data-lucide="refresh-cw"></i>Ricontrolla fonte</button></div>`:'';
    modal(`<div class="mh"><h3>${esc(p.n)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>${verify}<div class="card"><div class="muted">PROFILO DI SVILUPPO</div><h3>${esc(profile(p))}</h3>${p.developmentNotes?`<p class="muted">${esc(p.developmentNotes)}</p>`:''}<button class="btn alt" onclick='openPlayerDevelopment(${JSON.stringify(String(p.id))})'><i data-lucide="sliders-horizontal"></i>Modifica profilo</button></div><div class="grid g4" style="margin-top:12px"><div class="card"><b>Presenze</b><div class="kpi">${s.present}</div></div><div class="card"><b>Assenze</b><div class="kpi">${s.absent}</div></div><div class="card"><b>Ritardi</b><div class="kpi">${s.late}</div></div><div class="card"><b>Indisponibile</b><div class="kpi">${s.unavailable}</div></div></div><div class="card" style="margin-top:12px"><div class="muted">PERCENTUALE STAGIONALE</div><div class="kpi">${s.pct}%</div><p class="muted">Calcolata su ${s.total} rilevazioni registrate.</p><button class="btn alt" onclick='openFamilyContacts(${JSON.stringify(String(p.id))})'><i data-lucide="contact-round"></i>Contatti famiglia</button></div><div class="section">STORICO RECENTE</div><div class="card">${history}</div>`);
  };

  window.osgbReloadPlayerStats=loadStats;
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(!client)return;await waitRoster();await loadStats();});
})();
